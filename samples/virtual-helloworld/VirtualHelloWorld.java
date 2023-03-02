public class VirtualHelloWorld
{
    static class OverriddenHelloWorld extends VirtualHelloWorld
    {
        public void doSth(Object o)
        {
            System.out.println(o);
        }

        public String toString()
        {
            return "HelloWorld2";
        }
    }

    static VirtualHelloWorld instance = new VirtualHelloWorld();

    public static void setInstance()
    {
        System.out.println("Dummy print to avoid inlining");
        instance = new OverriddenHelloWorld();    
    }

    public static void main(String[] args)
    {
        setInstance();
        instance.doSth(args[0]);
    }

    @Override
    public String toString()
    {
        return "Hello World!";
    }

    public void doSth(Object o)
    {
        System.out.print("Something " + o);
    }
}