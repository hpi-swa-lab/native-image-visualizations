public final class ClassInitializationTracing
{
    /*
     The heap-assignment-tracing-agent replaces every "aastore" Bytecode instruction with a call to this method.
     */
    /*
    public static void storeArrReplacement(Object[] arr, int index, Object value)
    {
        onArrStore(arr, index, value);
        arr[index] = value;
    }

    private static native void onArrStore(Object[] arr, int index, Object value);
    */

    public static void onClinitStart()
    {
        System.err.println("onClinitStart");
    }
}