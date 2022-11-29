import java.util.function.Consumer;
import java.lang.reflect.Method;
import java.lang.System;

public class ReflectiveClassInitializationWorld
{
    static
    {
        long a = 0;

        for(long i = 0; i < 1000L; i++)
        {
            a += i;
        }

        result = a;

        Consumer<String> f = null;

        String name = "print";

        // Böse
        name = System.getenv("METHOD_NAME");

        try
        {
            Method m = ReflectiveClassInitializationWorld.class.getMethod(name, String.class);

            f = arg -> {
                try
                {
                    m.invoke(null, arg);
                }
                catch(Exception ex) {}
            };
        }
        catch(NoSuchMethodException ex2){
        }

        fun = f;
    }

    static long result;

    public static void print(String arg)
    {
        System.err.println("I've got to print \"" + arg + "\"");
        System.out.println(arg);
        System.out.println("And result is " + result);
    }

    static Consumer<String> fun;

    public static void main(String[] args)
    {
        if(fun != null) {
            fun.accept("Hello World!");
        }
    }
}