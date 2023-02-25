#include <jvmti.h>
#include <iostream>
#include <span>
#include <cstring>
#include <cassert>
#include <vector>
#include <fstream>
#include "settings.h"
#include <ranges>
#include <unordered_map>
#include <memory>

#define check_code(retcode, result) if((result)) { cerr << (#result) << "Error!!! code " << result << ":" << endl; return retcode; }
#define check(result) if((result)) { cerr << (#result) << "Error!!! code " << result << ":" << endl; assert(false); exit(1); }

using namespace std;

bool add_clinit_hook(jvmtiEnv* jvmti_env, const unsigned char* src, jint src_len, unsigned char** dst_ptr, jint* dst_len_ptr);

static void JNICALL onFieldModification(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jlocation location,
        jclass field_klass,
        jobject object,
        jfieldID field,
        char signature_type,
        jvalue new_value);

static void JNICALL onClassPrepare(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jclass klass);

static void JNICALL onVMInit(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread);

static void JNICALL onFramePop(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jboolean was_popped_by_exception);

static void JNICALL onClassFileLoad(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jclass class_being_redefined,
        jobject loader,
        const char* name,
        jobject protection_domain,
        jint class_data_len,
        const unsigned char* class_data,
        jint* new_class_data_len,
        unsigned char** new_class_data);

static void JNICALL onThreadStart(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread);

static void JNICALL onThreadEnd(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread);

static void JNICALL onObjectFree(
        jvmtiEnv *jvmti_env,
        jlong tag);

static void JNICALL onBreakpoint(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jlocation location);

#if LOG_METHOD_ENTRY_EXIT_EVENTS
static void JNICALL onMethodEntry
        (jvmtiEnv *jvmti_env,
         JNIEnv* jni_env,
         jthread thread,
         jmethodID method);

static void JNICALL onMethodExit
        (jvmtiEnv *jvmti_env,
         JNIEnv* jni_env,
         jthread thread,
         jmethodID method,
         jboolean was_popped_by_exception,
         jvalue return_value);
#endif


class AgentThreadContext
{
    vector<jclass> runningClassInitializations;

public:
    static AgentThreadContext* from_thread(jvmtiEnv* jvmti_env, jthread t)
    {
        AgentThreadContext* tc;
        check(jvmti_env->GetThreadLocalStorage(t, (void**)&tc));

        if(!tc)
        {
#if LOG
            cerr << "Thread had no initialized context!" << endl;
#endif
            tc = new AgentThreadContext();
            check(jvmti_env->SetThreadLocalStorage(t, tc));
        }

        return tc;
    }

    void clinit_push(JNIEnv* env, jclass clazz)
    {
        runningClassInitializations.push_back((jclass)env->NewGlobalRef(clazz));
    }

    void clinit_pop(JNIEnv* env)
    {
        assert(!runningClassInitializations.empty());
        runningClassInitializations.pop_back();
        // Leaking jclass global objects since they serve in ObjectContext...
    }

    [[nodiscard]] jclass clinit_top() const
    {
        return runningClassInitializations.back();
    }

    [[nodiscard]] bool clinit_empty() const
    {
        return runningClassInitializations.empty();
    }
};

struct ObjectContext
{
    jclass allocReason;

protected:
    ObjectContext(jclass allocReason) : allocReason(allocReason) {}

public:
    static ObjectContext* create(jvmtiEnv* jvmti_env, JNIEnv* env, jobject o, jclass allocReason);

    static ObjectContext* get(jvmtiEnv* jvmti_env, jobject o)
    {
        ObjectContext* oc;
        check(jvmti_env->GetTag(o, (jlong*)&oc));
        return oc;
    }

    static ObjectContext* get_or_create(jvmtiEnv* jvmti_env, JNIEnv* env, jobject o, jclass allocReason)
    {
        ObjectContext* oc = get(jvmti_env, o);

        if(!oc)
            oc = create(jvmti_env, env, o, allocReason);

        return oc;
    }
};

struct Write
{
    ObjectContext* val;
    jclass reason;
};

class WriteHistory
{
    vector<Write> history;

public:
    void add(ObjectContext* val, jclass reason)
    {
        history.emplace_back(val, reason);
    }

    jclass lookup(ObjectContext* writtenVal)
    {
        for(const Write& write : views::reverse(history))
        {
            if(write.val == writtenVal)
                return write.reason;
        }

        return nullptr;
    }
};

struct ClassContext;

static unordered_map<string, ClassContext*> all_class_contexts;

class ClassContext
{
    string internal_name;
    vector<WriteHistory> fields_history;
    unordered_map<jfieldID, size_t> nonstatic_field_indices;
    unordered_map<jfieldID, size_t> static_field_indices;

    static string get_internal_name(jvmtiEnv* jvmti_env, jclass klass)
    {
        char* signature;
        char* generic;
        check(jvmti_env->GetClassSignature(klass, &signature, &generic));
        return signature;
    }

    ClassContext(jvmtiEnv* jvmti_env, JNIEnv* jni_env, jclass klass) : internal_name(get_internal_name(jvmti_env, klass))
    {
        do
        {
            jint count;
            jfieldID* fields;
            jvmti_env->GetClassFields(klass, &count, &fields);

            for(size_t i = 0; i < count; i++)
            {
                char* field_name;
                char* field_signature;
                char* field_generic;

                check(jvmti_env->GetFieldName(klass, fields[i], &field_name, &field_signature, &field_generic));

                // Don't care for primitive types
                if(field_signature[0] != 'L' && field_signature[0] != '[')
                    continue;

                jint modifiers;
                check(jvmti_env->GetFieldModifiers(klass, fields[i], &modifiers));

                if(modifiers & 8 /* ACC_STATIC */)
                    static_field_indices.emplace(fields[i], static_field_indices.size());
                else
                    nonstatic_field_indices.emplace(fields[i], nonstatic_field_indices.size());
            }

            klass = jni_env->GetSuperclass(klass);
        }
        while(klass);

        fields_history.resize(static_field_indices.size());
    }

public:
    void registerWrite(jfieldID field, ObjectContext* newVal, jclass reason)
    {
        fields_history.at(static_field_indices[field]).add(newVal, reason);
    }

    jclass getFieldReason(jfieldID field, ObjectContext* writtenVal)
    {
        return fields_history.at(static_field_indices[field]).lookup(writtenVal);
    }

    static ClassContext* get_or_create(jvmtiEnv* jvmti_env, JNIEnv* jni_env, jclass klass)
    {
        string internal_name = get_internal_name(jvmti_env, klass);
        auto it = all_class_contexts.find(internal_name);
        ClassContext* cc;

        if(it == all_class_contexts.end())
        {
            cc = new ClassContext(jvmti_env, jni_env, klass);
            all_class_contexts.emplace(internal_name, cc);
        }
        else
        {
            cc = it->second;
        }

        return cc;
    }

    size_t get_nonstatic_field_index(jfieldID field)
    {
        auto it = nonstatic_field_indices.find(field);
        assert(it != nonstatic_field_indices.end());
        return it->second;
    }

    size_t get_nonstatic_field_count() const
    {
        return nonstatic_field_indices.size();
    }

    jclass made_reachable_by = nullptr;
};

struct NonArrayObjectContext : public ObjectContext
{
    ClassContext* cc;
    vector<WriteHistory> fields_history;

public:
    NonArrayObjectContext(jclass allocReason, ClassContext* cc) : ObjectContext(allocReason), cc(cc)
    {
        fields_history.resize(cc->get_nonstatic_field_count());
    }

    void registerWrite(jfieldID field, ObjectContext* newVal, jclass reason)
    {
        fields_history.at(cc->get_nonstatic_field_index(field)).add(newVal, reason);
    }

    jclass getWriteReason(jfieldID field, ObjectContext* writtenVal)
    {
        return fields_history.at(cc->get_nonstatic_field_index(field)).lookup(writtenVal);
    }
};

struct ArrayObjectContext : public ObjectContext
{
    vector<WriteHistory> elements_history;

public:
    ArrayObjectContext(jclass allocReason, size_t array_length) : ObjectContext(allocReason), elements_history(array_length)
    { }

    void registerWrite(jint index, ObjectContext* newVal, jclass reason)
    {
        elements_history[index].add(newVal, reason);
    }

    jclass getWriteReason(jint index, ObjectContext* writtenVal)
    {
        return elements_history[index].lookup(writtenVal);
    }
};

ObjectContext* ObjectContext::create(jvmtiEnv* jvmti_env, JNIEnv* env, jobject o, jclass allocReason)
{
    jclass oClass = env->GetObjectClass(o);
    char* signature;
    char* generic;
    check(jvmti_env->GetClassSignature(oClass, &signature, &generic));

    ClassContext* cc = ClassContext::get_or_create(jvmti_env, env, oClass);

    ObjectContext* oc;

    if(signature[0] == 'L')
    {
        oc = new NonArrayObjectContext(allocReason, cc);
    }
    else if(signature[0] == '[')
    {
        size_t array_length = env->GetArrayLength((jarray)o);
        oc = new ArrayObjectContext(allocReason, array_length);
    }
    else
    {
        assert(false);
    }

    check(jvmti_env->SetTag(o, (jlong)oc));
    return oc;
}





class Environment
{
    jvmtiEnv* env;

    static jvmtiIterationControl JNICALL heapObjectCallback(jlong class_tag, jlong size, jlong* tag_ptr, void* user_data)
    {
        ObjectContext* oc = *(ObjectContext**)tag_ptr;
        delete oc;
        return JVMTI_ITERATION_CONTINUE;
    }

public:
    Environment(jvmtiEnv* env) : env(env) {}

    ~Environment()
    {
        // Free ObjectContexts
        auto res = env->IterateOverHeap(JVMTI_HEAP_OBJECT_TAGGED, heapObjectCallback, nullptr);

        if(res != JVMTI_ERROR_NONE)
        {
            // May happen e.g. on normal process exit, when Destructor is called from c++ stdlib.
            return;
        }

        // Free ClassContexts
        all_class_contexts.clear();
        all_class_contexts.reserve(0);

        check(env->DisposeEnvironment());
    }

    jvmtiEnv* jvmti_env() const { return env; }
};

static shared_ptr<Environment> _jvmti_env;



#include <unistd.h>
#include <link.h>
#include <sstream>

static int callback(dl_phdr_info* info, size_t size, void* data)
{
    auto name = string_view(info->dlpi_name);
    string_view self("libheap_assignment_tracing_agent.so");

    if(name.ends_with(self))
    {
        *(string*)data = string_view(info->dlpi_name).substr(0, name.size() - self.size());
        return 1;
    }
    else
    {
        return 0;
    }
}

static string get_own_path()
{
    string path;
    bool success = dl_iterate_phdr(callback, &path);
    assert(success);
    return path;
}

JNIEXPORT jint JNICALL Agent_OnLoad(JavaVM *vm, char *options, void *reserved)
{
    //cerr << nounitbuf;
    //iostream::sync_with_stdio(false);

    jvmtiEnv* env;
    check_code(1, vm->GetEnv(reinterpret_cast<void **>(&env), JVMTI_VERSION_1_2));

    auto own_path = get_own_path();
    check_code(1, env->AddToBootstrapClassLoaderSearch(own_path.c_str()));

    _jvmti_env = std::make_shared<Environment>(env);

    jvmtiCapabilities cap{ 0 };
    cap.can_generate_frame_pop_events = true;
    cap.can_tag_objects = true;
    cap.can_generate_object_free_events = true;
    cap.can_retransform_classes = true;
    cap.can_retransform_any_class = true;
    cap.can_generate_all_class_hook_events = true;
#if BREAKPOINTS_ENABLE
    cap.can_generate_breakpoint_events = true;
    cap.can_generate_field_modification_events = true;
#endif
#if LOG_METHOD_ENTRY_EXIT_EVENTS
    cap.can_generate_method_entry_events = true;
    cap.can_generate_method_exit_events = true;
#endif

    check_code(1, env->AddCapabilities(&cap));

    jvmtiEventCallbacks callbacks{ nullptr };
    callbacks.FieldModification = onFieldModification;
    callbacks.ClassPrepare = onClassPrepare;
    callbacks.VMInit = onVMInit;
    callbacks.FramePop = onFramePop;
    callbacks.ClassFileLoadHook = onClassFileLoad;
    callbacks.ThreadStart = onThreadStart;
    callbacks.ThreadEnd = onThreadEnd;
    callbacks.ObjectFree = onObjectFree;
    callbacks.Breakpoint = onBreakpoint;
#if LOG_METHOD_ENTRY_EXIT_EVENTS
    callbacks.MethodEntry = onMethodEntry;
    callbacks.MethodExit = onMethodExit;
#endif
    check_code(1, env->SetEventCallbacks(&callbacks, sizeof(callbacks)));
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_VM_INIT, nullptr));
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_FRAME_POP, nullptr));
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_THREAD_START, nullptr));
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_THREAD_END, nullptr));
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_OBJECT_FREE, nullptr));
#if REWRITE_ENABLE
    check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_CLASS_FILE_LOAD_HOOK, nullptr));
#endif
    //check_code(1, env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_BREAKPOINT, nullptr));

    return 0;
}

static void processClass(jvmtiEnv* jvmti_env, jclass klass)
{
    char* class_signature;
    char* class_generic;

    check(jvmti_env->GetClassSignature(klass, &class_signature, &class_generic));

#if LOG
    cerr << "New Class: " << class_signature << "\n";
#endif

    // Hook into field modification events

    jint field_count;
    jfieldID* fields;

    check(jvmti_env->GetClassFields(klass, &field_count, &fields));

    for(jint i = 0; i < field_count; i++)
    {
        char* field_name;
        char* field_signature;
        char* field_generic;

        check(jvmti_env->GetFieldName(klass, fields[i], &field_name, &field_signature, &field_generic));

        // Don't care for primitive types
        if(field_signature[0] != 'L' && field_signature[0] != '[')
            continue;

        auto return_code = jvmti_env->SetFieldModificationWatch(klass, fields[i]);
        if(return_code == JVMTI_ERROR_DUPLICATE)
            return; // Silently ignore if the class had already been processed
        check(return_code);

#if LOG
        cerr << "SetFieldModificationWatch: " << class_signature << " . " << field_name << " (" << field_signature << ")\n";
#endif
    }

    if(string_view(class_signature) == "L" "com/sun/org/apache/xerces/internal/impl/xpath/regex/Token$CharToken" ";")
    {
        span<jmethodID> methods;
        {
            jint method_count;
            jmethodID *methods_ptr;
            check(jvmti_env->GetClassMethods(klass, &method_count, &methods_ptr));
            methods = {methods_ptr, (size_t)method_count};
        }

        for(jmethodID m : methods)
        {
            char* name;
            char* signature;
            char* generic;
            check(jvmti_env->GetMethodName(m, &name, &signature, &generic));

            if(string_view(name) == "<init>")
            {
                check(jvmti_env->SetBreakpoint(m, 0));
                cerr << "Found constructor" << endl;
            }
        }
    }
}

static jniNativeInterface* original_jni;
static void get_class_name(jvmtiEnv *jvmti_env, jclass clazz, span<char> buffer);

static void logArrayWrite(JNIEnv* env, jobjectArray arr, jsize index, jobject val)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    jthread thread;
    check(jvmti_env->GetCurrentThread(&thread));

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    if(tc->clinit_empty())
        return;

    if(val)
    {
        ObjectContext* val_oc = ObjectContext::get_or_create(jvmti_env, env, val, tc->clinit_top());
        ObjectContext* arr_oc = ObjectContext::get_or_create(jvmti_env, env, arr, tc->clinit_top());
        ((ArrayObjectContext*)arr_oc)->registerWrite(index, val_oc, tc->clinit_top());
    }

#if LOG || PRINT_CLINIT_HEAP_WRITES
    jclass arr_class = env->GetObjectClass(arr);

    char class_name[1024];
    get_class_name(jvmti_env, arr_class, class_name);

    char new_value_class_name[1024];
    if(!val)
    {
        strcpy(new_value_class_name, "null");
    }
    else
    {
        jclass new_value_class = env->GetObjectClass(val);
        get_class_name(jvmti_env, new_value_class, new_value_class_name);
    }

    char cause_class_name[1024];

    if(tc->clinit_empty())
        cause_class_name[0] = 0;
    else
        get_class_name(jvmti_env, tc->clinit_top(), cause_class_name);

    class_name[strlen(class_name) - 2] = 0; // Cut off last "[]"
    cerr << cause_class_name << ": " << class_name << '[' << index << ']' << " = " << new_value_class_name << '\n';
#endif
}

static void JNICALL setObjectArrayElement(JNIEnv *env, jobjectArray array, jsize index, jobject val)
{
    logArrayWrite(env, array, index, val);
    original_jni->SetObjectArrayElement(env, array, index, val);
}

static void JNICALL onVMInit(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

#if BREAKPOINTS_ENABLE
    check(jvmti_env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_CLASS_PREPARE, nullptr));

    jint num_classes;
    jclass* classes_ptr;

    check(jvmti_env->GetLoadedClasses(&num_classes, &classes_ptr));

    span<jclass> classes(classes_ptr, num_classes);

    for(jclass clazz : classes)
    {
        jboolean is_modifiable;
        check(jvmti_env->IsModifiableClass(clazz, &is_modifiable));
        if(is_modifiable)
            check(jvmti_env->RetransformClasses(1, &clazz));

        jint status;
        check(jvmti_env->GetClassStatus(clazz, &status));
        if(status & JVMTI_CLASS_STATUS_PREPARED)
            processClass(jvmti_env, clazz);
    }
#endif // BREAKPOINTS_ENABLE



    jniNativeInterface* redirected_jni;
    check(jvmti_env->GetJNIFunctionTable(&original_jni));
    check(jvmti_env->GetJNIFunctionTable(&redirected_jni));
    redirected_jni->SetObjectArrayElement = setObjectArrayElement;
    check(jvmti_env->SetJNIFunctionTable(redirected_jni));
}

static void get_class_name(jvmtiEnv *jvmti_env, jclass clazz, span<char> buffer)
{
    if(!clazz)
    {
        buffer[0] = 0;
        return;
    }

    char* class_signature;
    char* class_generic;

    auto res = jvmti_env->GetClassSignature(clazz, &class_signature, &class_generic);

    if(res)
    {
        cerr << "GetClassSignature failed!" << endl;
        buffer[0] = 0;
        return;
    }

    size_t array_nesting = 0;
    while(class_signature[array_nesting] == '[')
        array_nesting++;

    size_t pos;

    if(class_signature[array_nesting] == 'L')
    {
        for(pos = 0; pos < buffer.size() - 1; pos++)
        {
            char c = class_signature[pos+array_nesting+1];

            if(c == 0 || c == ';')
            {
                break;
            }

            if(c == '/')
                c = '.';

            buffer[pos] = c;
        }

        if(pos >= buffer.size() - 1)
            buffer[buffer.size() - 1] = 0;
    }
    else
    {
        const char* keyword;

        switch(class_signature[array_nesting])
        {
            case 'B': keyword = "byte"; break;
            case 'C': keyword = "char"; break;
            case 'D': keyword = "double"; break;
            case 'F': keyword = "float"; break;
            case 'I': keyword = "int"; break;
            case 'J': keyword = "long"; break;
            case 'S': keyword = "short"; break;
            case 'Z': keyword = "boolean"; break;
            default:
                buffer[0] = 0;
                return;
        }

        for(pos = 0; keyword[pos]; pos++)
            buffer[pos] = keyword[pos];
    }

    for(size_t i = 0; i < array_nesting; i++)
    {
        buffer[pos++] = '[';
        buffer[pos++] = ']';
    }

    buffer[pos] = 0;
}

static void onFieldModification(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jlocation location,
        jclass field_klass,
        jobject object,
        jfieldID field,
        char signature_type,
        jvalue new_value)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    char* field_name;
    char* field_signature;
    char* field_generic;
    check(jvmti_env->GetFieldName(field_klass, field, &field_name, &field_signature, &field_generic));

    if(!new_value.l)
        return;

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    assert(!tc->clinit_empty());

    if(!tc->clinit_empty())
    {
        ObjectContext* val_oc = ObjectContext::get_or_create(jvmti_env, jni_env, new_value.l, tc->clinit_top());

        if(object)
        {
            auto object_oc = (NonArrayObjectContext*)ObjectContext::get_or_create(jvmti_env, jni_env, object, tc->clinit_top());
            object_oc->registerWrite(field, val_oc, tc->clinit_top());
        }
        else
        {
            ClassContext* cc = ClassContext::get_or_create(jvmti_env, jni_env, field_klass);
            cc->registerWrite(field, val_oc, tc->clinit_top());
        }
    }

#if LOG || PRINT_CLINIT_HEAP_WRITES
    char class_name[1024];
    get_class_name(jvmti_env, field_klass, {class_name, class_name + 1024});

    char new_value_class_name[1024];
    jclass new_value_class = jni_env->GetObjectClass(new_value.l);
    get_class_name(jvmti_env, new_value_class, new_value_class_name);

    char cause_class_name[1024];

    if(tc->clinit_empty())
        cause_class_name[0] = 0;
    else
        get_class_name(jvmti_env, tc->clinit_top(), cause_class_name);

    if(string_view(new_value_class_name) == "java.lang.String")
    {
        const char* str_val = jni_env->GetStringUTFChars((jstring)new_value.l, nullptr);
        cerr << cause_class_name << ": " << class_name << "." << field_name << " = \"" << str_val << "\"\n";
        jni_env->ReleaseStringUTFChars((jstring)new_value.l, str_val);
    }
    else if(string_view(new_value_class_name) == "java.lang.Class")
    {
        char val_content[1024];
        get_class_name(jvmti_env, (jclass)new_value.l, val_content);
        cerr << cause_class_name << ": " << class_name << "." << field_name << " = java.lang.Class: \"" << val_content << "\"\n";
    }
    else
    {
        cerr << cause_class_name << ": " << class_name << "." << field_name << " = " << new_value_class_name << '\n';
    }
#endif
}

static void JNICALL onFramePop(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jboolean was_popped_by_exception)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    jclass type;
    check(jvmti_env->GetMethodDeclaringClass(method, &type));

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    tc->clinit_pop(jni_env);

#if BREAKPOINTS_ENABLE
    if(tc->clinit_empty())
    {
        check(jvmti_env->SetEventNotificationMode(JVMTI_DISABLE, JVMTI_EVENT_FIELD_MODIFICATION, thread));
#if LOG_METHOD_ENTRY_EXIT_EVENTS
        check(jvmti_env->SetEventNotificationMode(JVMTI_DISABLE, JVMTI_EVENT_METHOD_ENTRY, thread));
        check(jvmti_env->SetEventNotificationMode(JVMTI_DISABLE, JVMTI_EVENT_METHOD_EXIT, thread));
#endif
    }
#endif

#if LOG
    char inner_clinit_name[1024];
    get_class_name(jvmti_env, type, inner_clinit_name);
    cerr << inner_clinit_name << ".<clinit>() ENDED\n";
#endif
}

static void JNICALL onClassPrepare(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jclass klass)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    processClass(jvmti_env, klass);
}

static void JNICALL onClassFileLoad(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jclass class_being_redefined,
        jobject loader,
        const char* name,
        jobject protection_domain,
        jint class_data_len,
        const unsigned char* class_data,
        jint* new_class_data_len,
        unsigned char** new_class_data)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

#if LOG
    cerr << "ClassLoad: " << name << endl;
#endif

    if(string_view(name) == HOOK_CLASS_NAME // Do not replace our own hooks, logically
    || string_view(name) == "com/oracle/svm/core/jni/functions/JNIFunctionTables") // Crashes during late compile phase
        return;

    add_clinit_hook(jvmti_env, class_data, class_data_len, new_class_data, new_class_data_len);
}

extern "C" JNIEXPORT void JNICALL Java_HeapAssignmentTracingHooks_onClinitStart(JNIEnv* env, jobject self)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    jvmtiPhase phase;
    check(jvmti_env->GetPhase(&phase));

    if(phase != JVMTI_PHASE_LIVE)
        return;

    jthread thread;
    check(jvmti_env->GetCurrentThread(&thread));

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    jmethodID method;
    jlocation location;
    check(jvmti_env->GetFrameLocation(thread, 1, &method, &location));

    jclass type;
    check(jvmti_env->GetMethodDeclaringClass(method, &type));

#if BREAKPOINTS_ENABLE
    if(tc->clinit_empty())
    {
        check(jvmti_env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_FIELD_MODIFICATION, thread));
#if LOG_METHOD_ENTRY_EXIT_EVENTS
        check(jvmti_env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_METHOD_ENTRY, thread));
        check(jvmti_env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_METHOD_EXIT, thread));
#endif
    }
#endif

#if LOG || PRINT_CLINIT_HEAP_WRITES
    char inner_clinit_name[1024];
    get_class_name(jvmti_env, type, inner_clinit_name);

    char outer_clinit_name[1024];

    if(tc->clinit_empty())
        outer_clinit_name[0] = 0;
    else
        get_class_name(jvmti_env, tc->clinit_top(), outer_clinit_name);

    if(LOG || (strcmp(inner_clinit_name, outer_clinit_name) != 0))
    {
        cerr << outer_clinit_name << ": " << inner_clinit_name << ".<clinit>()\n";
    }
#endif

    jclass made_reachable_by = tc->clinit_empty() ? nullptr : tc->clinit_top();
    tc->clinit_push(env, type);

    if(made_reachable_by)
    {
        // Use tc->clinit_top because thats a global ref now...
        ClassContext* cc = ClassContext::get_or_create(jvmti_env, env, tc->clinit_top());
        if(cc->made_reachable_by)
        {
            cerr << "FAILURE" << endl;
            exit(1);
        }
        cc->made_reachable_by = made_reachable_by;
    }

    check(jvmti_env->NotifyFramePop(thread, 1));
}

static void JNICALL onThreadStart(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    auto* tc = new AgentThreadContext();
    check(jvmti_env->SetThreadLocalStorage(thread, tc));
}

static void JNICALL onThreadEnd(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);
    delete tc;
}

void onObjectFree(jvmtiEnv *jvmti_env, jlong tag)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

#if LOG
    cerr << "Object freed!\n";
#endif
    auto* oc = (ObjectContext*)tag;
    delete oc;
}

extern "C" JNIEXPORT void JNICALL Java_HeapAssignmentTracingHooks_notifyArrayWrite(JNIEnv* env, jobject self, jobjectArray arr, jint index, jobject val)
{
    logArrayWrite(env, arr, index, val);
}

extern "C" JNIEXPORT void JNICALL Java_HeapAssignmentTracingHooks_onThreadStart(JNIEnv* env, jobject self, jthread newThread)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

#if LOG || PRINT_CLINIT_HEAP_WRITES
    jvmtiPhase phase;
    check(jvmti_env->GetPhase(&phase));

    if(phase != JVMTI_PHASE_LIVE)
        return;

    jthread thread;
    check(jvmti_env->GetCurrentThread(&thread));

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    if(tc->clinit_empty())
        return;

    char outer_clinit_name[1024];
    get_class_name(jvmti_env, tc->clinit_top(), outer_clinit_name);

    jvmtiThreadInfo info;
    check(jvmti_env->GetThreadInfo(newThread, &info));

    cerr << outer_clinit_name << ": " << "Thread.start(): \"" << info.name << "\"\n";
#endif
}

extern "C" JNIEXPORT jclass JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_getResponsibleClass(JNIEnv* env, jobject thisClass, jobject imageHeapObject)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return nullptr;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    ObjectContext* oc = ObjectContext::get(jvmti_env, imageHeapObject);

    if(!oc)
        return nullptr;

    return oc->allocReason;
}

extern "C" JNIEXPORT jclass JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_getClassResponsibleForNonstaticFieldWrite(JNIEnv* env, jobject thisClass, jobject receiver, jobject field, jobject val)
{
    auto jvmti_env_guard = _jvmti_env;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    auto receiver_oc = (NonArrayObjectContext*)ObjectContext::get(jvmti_env, receiver);
    auto val_oc = (NonArrayObjectContext*)ObjectContext::get(jvmti_env, val);

    jfieldID fieldID = env->FromReflectedField(field);

    char *name, *signature, *generic;
    jvmtiError error = jvmti_env->GetFieldName(env->GetObjectClass(receiver), fieldID, &name, &signature, &generic);

    if(error == JVMTI_ERROR_INVALID_FIELDID)
    {
        // May happen when the field of a substitution is accessed
#ifdef SHOW_EXISTING
#if SHOW_EXISTING == 0
        cerr << "Invalid Field!\n";
#endif
#endif
        return nullptr;
    }

    check(error);

    jclass res = nullptr;

    if(receiver_oc && val_oc)
    {
        res = receiver_oc->getWriteReason(env->FromReflectedField(field), val_oc);
    }

#ifdef SHOW_EXISTING
    if(bool(res) == SHOW_EXISTING)
    {
        char receiver_class_name[1024];
        get_class_name(jvmti_env, env->GetObjectClass(receiver), receiver_class_name);
        char val_class_name[1024];
        get_class_name(jvmti_env, env->GetObjectClass(val), val_class_name);

        stringstream s;
        s << receiver_class_name << '.' << name << '=' << val_class_name << endl;
        cerr << s.str();
    }
#endif

    return res;
}

extern "C" JNIEXPORT jclass JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_getClassResponsibleForStaticFieldWrite(JNIEnv* env, jobject thisClass, jclass declaring, jobject field, jobject val)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return nullptr;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    auto declaring_cc = ClassContext::get_or_create(jvmti_env, env, declaring);
    auto val_oc = (NonArrayObjectContext*)ObjectContext::get(jvmti_env, val);

    jint class_status;
    check(jvmti_env->GetClassStatus(declaring, &class_status));

    if(!(class_status & JVMTI_CLASS_STATUS_INITIALIZED))
    {
        char class_name[1024];
        get_class_name(jvmti_env, declaring, class_name);
        cerr << "Class not initialized yet field being asked for: " << class_name << endl;
        return nullptr;
    }

    jfieldID fieldID = env->FromReflectedField(field);

    jclass res = nullptr;

    if(val_oc)
    {
        res = declaring_cc->getFieldReason(env->FromReflectedField(field), val_oc);
    }

#ifdef SHOW_EXISTING
    char declaring_class_name[1024];
    get_class_name(jvmti_env, declaring, declaring_class_name);
    char val_class_name[1024];
    get_class_name(jvmti_env, env->GetObjectClass(val), val_class_name);
    char *field_name, *signature, *generic;
    check(jvmti_env->GetFieldName(declaring, fieldID, &field_name, &signature, &generic));

    if(bool(res) == SHOW_EXISTING)
    {
        stringstream s;
        s << declaring_class_name << '.' << field_name << '=' << val_class_name << endl;
        cerr << s.str();
    }
#endif

    return res;
}

extern "C" JNIEXPORT jclass JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_getClassResponsibleForArrayWrite(JNIEnv* env, jobject thisClass, jobjectArray array, jint index, jobject val)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return nullptr;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    auto array_oc = (ArrayObjectContext*)ObjectContext::get(jvmti_env, array);
    auto val_oc = (NonArrayObjectContext*)ObjectContext::get(jvmti_env, val);

    jclass res = nullptr;

    if(array_oc && val_oc)
    {
        res = array_oc->getWriteReason(index, val_oc);
    }

#ifdef SHOW_EXISTING
    if(bool(res) == SHOW_EXISTING)
    {
        char array_class_name[1024];
        get_class_name(jvmti_env, env->GetObjectClass(array), array_class_name);
        char val_class_name[1024];
        get_class_name(jvmti_env, env->GetObjectClass(val), val_class_name);

        stringstream s;
        s << array_class_name << '=' << val_class_name << endl;
        cerr << s.str();
    }
#endif

    return res;
}

extern "C" JNIEXPORT jclass JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_getBuildTimeClinitResponsibleForBuildTimeClinit(JNIEnv* env, jobject thisClass, jclass clazz)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return nullptr;
    auto jvmti_env = jvmti_env_guard->jvmti_env();

    ClassContext* cc = ClassContext::get_or_create(jvmti_env, env, clazz);
    return cc->made_reachable_by;
}

extern "C" JNIEXPORT void JNICALL Java_com_oracle_graal_pointsto_reports_HeapAssignmentTracing_00024NativeImpl_dispose(JNIEnv* env, jobject thisClass)
{
    _jvmti_env.reset();
}

static void JNICALL onBreakpoint(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jmethodID method,
        jlocation location)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    if(tc->clinit_empty())
        cerr << "Allocated Token$CharToken" << endl;
    else
    {
        char cname[1024];
        get_class_name(jvmti_env, tc->clinit_top(), cname);
        cerr << "Allocated Token$CharToken in " << cname << endl;

        jvmtiFrameInfo frames[100];
        jint frames_len;
        check(jvmti_env->GetStackTrace(thread, 0, 100, frames, &frames_len));

        for(size_t i = 0; i < frames_len; i++)
        {
            char *name, *signature, *generic;
            jclass declaring_class;
            check(jvmti_env->GetMethodDeclaringClass(frames[i].method, &declaring_class));

            char declaring_class_name[1024];
            get_class_name(jvmti_env, declaring_class, declaring_class_name);

            check(jvmti_env->GetMethodName(frames[i].method, &name, &signature, &generic));
            cerr << "at " << declaring_class_name << '.' << name << endl;
        }
    }
}


#if LOG_METHOD_ENTRY_EXIT_EVENTS
static void JNICALL onMethodEntry(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread, jmethodID method)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    if(!tc || tc->clinit_empty())
        return;

    char outer_clinit_name[1024];
    get_class_name(jvmti_env, tc->clinit_top(), outer_clinit_name);

    char declaringClassName[1024];

    jclass declaringClass;
    check(jvmti_env->GetMethodDeclaringClass(method, &declaringClass));
    get_class_name(jvmti_env, declaringClass, declaringClassName);

    char *name, *signature, *generic;
    check(jvmti_env->GetMethodName(method, &name, &signature, &generic));

    cerr << outer_clinit_name << ": Entering " << declaringClassName << '.' << name << '(' << signature << ")\n";
}

static void JNICALL onMethodExit(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread, jmethodID method, jboolean was_popped_by_exception, jvalue return_value)
{
    auto jvmti_env_guard = _jvmti_env;
    if(!jvmti_env_guard)
        return;

    AgentThreadContext* tc = AgentThreadContext::from_thread(jvmti_env, thread);

    if(!tc || tc->clinit_empty())
        return;

    char outer_clinit_name[1024];
    get_class_name(jvmti_env, tc->clinit_top(), outer_clinit_name);

    char declaringClassName[1024];

    jclass declaringClass;
    check(jvmti_env->GetMethodDeclaringClass(method, &declaringClass));
    get_class_name(jvmti_env, declaringClass, declaringClassName);

    char *name, *signature, *generic;
    check(jvmti_env->GetMethodName(method, &name, &signature, &generic));

    cerr << outer_clinit_name << ": Exiting " << declaringClassName << '.' << name << '(' << signature << ")\n";
}
#endif