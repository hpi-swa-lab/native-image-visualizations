public final class ClassInitializationTracing
{
    public static native void onClinitStart();

    private static native void notifyArrayWrite(Object[] arr, int index, Object val);

    public static void onArrayWrite(Object[] arr, int index, Object val)
    {
        notifyArrayWrite(arr, index, val);
        arr[index] = val;
    }

    public static native void onThreadStart(java.lang.Thread newThread);
}