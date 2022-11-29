import java.util.function.Consumer;
import java.lang.reflect.Method;
import java.lang.System;

public class Example
{
    static
    {
        Thread thread = new Thread()
        {
            public void run()
            {
                while(true)
                    result++;
            }
        };

        thread.start();
    }

    static long result;

    public static void main(String[] args)
    {
        System.out.println("The result is " + result);
    }
}