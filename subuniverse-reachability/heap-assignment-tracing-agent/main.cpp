#include <jvmti.h>
#include <iostream>
#include <span>
#include <cstring>

#define check(name, result) if((result)) { cerr << (name " failed!") << endl; return 1; }

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

span<const char> load_options;

JNIEXPORT jint JNICALL Agent_OnLoad(JavaVM *vm, char *options, void *reserved)
{
    jvmtiEnv* env;
    check("GetEnv", vm->GetEnv(reinterpret_cast<void **>(&env), JVMTI_VERSION_1_2));

    if(options)
    {
        size_t options_len = strlen(options);
        char *options_copy;
        check("Allocate", env->Allocate(options_len, (unsigned char **) &options_copy));
        std::copy(options, options + options_len, options_copy);
        load_options = {options_copy, options_copy + options_len};
    }


    jvmtiCapabilities cap{ 0 };
    cap.can_generate_field_modification_events = true;
    cap.can_generate_single_step_events = true;
    cap.can_tag_objects = true;

    check("AddCapabilities", env->AddCapabilities(&cap));

    jvmtiEventCallbacks callbacks{ nullptr };
    callbacks.FieldModification = onFieldModification;
    callbacks.ClassPrepare = onClassPrepare;
    check("SetEvent: class loading", env->SetEventCallbacks(&callbacks, sizeof(callbacks)));

    check("Enable Class Prepare", env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_CLASS_PREPARE, nullptr));
    check("Enable FieldModification", env->SetEventNotificationMode(JVMTI_ENABLE, JVMTI_EVENT_FIELD_MODIFICATION, nullptr));

    return 0;
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
    auto res = jvmti_env->GetFieldName(field_klass, field, &field_name, &field_signature, &field_generic);

    if(res)
    {
        cerr << "GetFieldName" << endl;
        return;
    }

    char* class_signature;
    char* class_generic;

    res = jvmti_env->GetClassSignature(field_klass, &class_signature, &class_generic);

    if(res)
    {
        cerr << "GetClassSignature" << endl;
        return;
    }

    cout << class_signature << " " << field_name << "\n";
}

static void JNICALL onClassPrepare(
        jvmtiEnv *jvmti_env,
        JNIEnv* jni_env,
        jthread thread,
        jclass klass)
{
    char* class_signature;
    char* class_generic;

    auto res = jvmti_env->GetClassSignature(klass, &class_signature, &class_generic);

    if(res)
    {
        cerr << "GetClassSignature" << endl;
        return;
    }

    cout << "New Class: " << class_signature << "\n";

    /*
    if(!std::equal(&*load_options.begin(), &*load_options.end(), class_signature))
    {
        return;
    }
    */

    jint field_count;
    jfieldID* fields;

    res = jvmti_env->GetClassFields(klass, &field_count, &fields);

    if(res)
    {
        cerr << "GetClassFields" << endl;
        return;
    }

    for(jint i = 0; i < field_count; i++)
    {
        res = jvmti_env->SetFieldModificationWatch(klass, fields[i]);

        if(res)
        {
            cerr << "SetFieldModificationWatch: error" << endl;
            return;
        }

        cout << "SetFieldModificationWatch: success\n";
    }
}