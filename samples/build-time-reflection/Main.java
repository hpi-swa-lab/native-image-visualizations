/*
 * This code shows an interesting interaction between build-time class initialization and reflection.
 * The method "Main.print(String)" is nowhere called from a static point-of-view.
 * When running the class initializer of "Main" at build-time, the reflection access
 * succeeds in getting a method handle to "Main.print(String)" and can save it
 * in the field "Main.lambda". At run time, this lambda is called by the main function.
 *
 * How is the analysis finding out that "Main.print(String)" might be called and therefore needs to be compiled?
 *
 * When scanning the image heap, it will find the lambda in the field "Main.lambda". The closure object
 * contains an object of type "java.lang.reflect.Method" describing "Main.print(String)".
 * Upon finding it, the analysis will mark "Main.print(String)" as reflection accessible and therefore as reachable.
 *
 * A causality export should see through this and account the class initializer of "Main", and therefore the type's reachability
 * for the reachability of "Main.print(String)".
 */
 
import java.util.function.Consumer;
import java.lang.reflect.Method;
import java.lang.System;

public class Main {
    private static Consumer<String> createLambdaForMethod(String name) {
        try {
            Method m = Main.class.getMethod(name, String.class);
            
            return arg -> {
                try {
                    m.invoke(null, arg);
                }
                catch(Exception ex) {}
            };
        }
        catch(NoSuchMethodException ex2) {
            return null;
        }
    }

    public static Consumer<String> lambda = createLambdaForMethod("print");
    
    public static void print(String arg) {
        System.err.println("I've got to print \"" + arg + "\"");
    }

    public static void main(String[] args) {
        if(lambda != null) {
            lambda.accept("Hello World!");
        }
    }
}

