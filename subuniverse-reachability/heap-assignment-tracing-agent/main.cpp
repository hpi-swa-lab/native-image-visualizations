#include <jvmti.h>
#include <iostream>
#include <span>
#include <cstring>

#define check(result) if((result)) { cerr << (#result) << " [Error code " << result << "]" << endl; return 1; }
#define check_void(result) if((result)) { cerr << (#result) << " [Error code " << result << "]" << endl; return; }

using namespace std;

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

static jvmtiEnv* jvmti_env;

JNIEXPORT jint JNICALL Agent_OnLoad(JavaVM *vm, char *options, void *reserved)
{
    cerr << nounitbuf;
    iostream::sync_with_stdio(false);

    jvmtiEnv* env;
    check(vm->GetEnv(reinterpret_cast<void **>(&env), JVMTI_VERSION_1_2));

    jvmti_env = env;

    jvmtiCapabilities cap{ 0 };
    cap.can_generate_field_modification_events = true;
    cap.can_generate_single_step_events = true;
    cap.can_tag_objects = true;

    check(env->AddCapabilities(&cap));

    jvmtiEventCallbacks callbacks{ nullptr };
    callbacks.FieldModification = onFieldModification;
    callbacks.ClassPrepare = onClassPrepare;
    callbacks.VMInit = onVMInit;
    check(env->SetEventCallbacks(&callbacks, sizeof(callbacks)));
    check(env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_VM_INIT, nullptr));

    return 0;
}

static void processClass(jvmtiEnv* jvmti_env, jclass klass)
{
    char* class_signature;
    char* class_generic;

    check_void(jvmti_env->GetClassSignature(klass, &class_signature, &class_generic));

    cerr << "New Class: " << class_signature << "\n";

    jint field_count;
    jfieldID* fields;

    check_void(jvmti_env->GetClassFields(klass, &field_count, &fields));

    for(jint i = 0; i < field_count; i++)
    {
        char* field_name;
        char* field_signature;
        char* field_generic;

        check_void(jvmti_env->GetFieldName(klass, fields[i], &field_name, &field_signature, &field_generic));

        if(field_signature[0] != 'L' && field_signature[0] != '[')
            continue;

        check_void(jvmti_env->SetFieldModificationWatch(klass, fields[i]));

        cerr << "SetFieldModificationWatch: success: " << field_signature << "\n";
    }
}

static void JNICALL onVMInit(jvmtiEnv *jvmti_env, JNIEnv* jni_env, jthread thread)
{
    check_void(jvmti_env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_CLASS_PREPARE, nullptr));

    jint num_classes;
    jclass* classes_ptr;

    check_void(jvmti_env->GetLoadedClasses(&num_classes, &classes_ptr));

    span<jclass> classes(classes_ptr, num_classes);

    for(jclass clazz : classes)
    {
        jint status;
        check_void(jvmti_env->GetClassStatus(clazz, &status));

        if(status & JVMTI_CLASS_STATUS_PREPARED)
            processClass(jvmti_env, clazz);
    }
}

static void get_class_name(jvmtiEnv *jvmti_env, jclass clazz, span<char> buffer)
{
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
    char* field_name;
    char* field_signature;
    char* field_generic;
    check_void(jvmti_env->GetFieldName(field_klass, field, &field_name, &field_signature, &field_generic));

    char class_name[1024];
    get_class_name(jvmti_env, field_klass, {class_name, class_name + 1024});

    if(!new_value.l)
        return;

    jclass new_value_class = jni_env->GetObjectClass(new_value.l);

    char new_value_class_name[1024];
    get_class_name(jvmti_env, new_value_class, new_value_class_name);
    cerr << class_name << "." << field_name << " = " << new_value_class_name << '\n';
}

static void JNICALL onClassPrepare(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jclass klass)
{
    processClass(jvmti_env, klass);
}

extern "C" JNIEXPORT void JNICALL Java_com_oracle_svm_hosted_classinitialization_ClassInitializationSupport_onInit(JNIEnv* env, jobject self, jobject clazz, jboolean start)
{
    jthread t;
    check_void(jvmti_env->GetCurrentThread(&t));
    check_void(jvmti_env->SetEventNotificationMode(start ? JVMTI_ENABLE : JVMTI_DISABLE, JVMTI_EVENT_FIELD_MODIFICATION, t));
}