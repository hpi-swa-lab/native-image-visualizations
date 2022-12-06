public class MassiveHeap
{
    private static RandomLanguage instance = new RandomLanguage(100000);

    public static void main(String[] args)
    {
        for(String arg : args)
        {
            System.out.println(arg + " -> " + instance.lookup(arg));
        }
    }
}