/*
 * This code demonstrates how the analysis reasons about virtual functions:
 
 * "OverriddenHelloWorld.doSth(Object)" gets reachable because....
 * 1. "setInstance()" makes the type "OverriddenHelloWorld" flow into the field "instance"
 * 2. "main(...)" calls ".doSth(...)" on the field "instance"
 *
 * "VirtualHelloWorld.doSth(Object" gets reachable because...
 * 1. The class initializer of "VirtualHelloWorld" assigns an object of type "VirtualHelloWorld" to the field "instance"
 * 2. main(...)" calls ".doSth(...)" on the field "instance"
 *
 *
 * Furthermore, the analysis will assume both ".toString()" methods as reachable
 * because both types can be instantiated, therefore added to the AllInstantiatedTypeFlow,
 * and may apppear behind every "Object"-typed variable where the analysis can't constrain the types any further.
 */

public class VirtualHelloWorld {
    private static class OverriddenHelloWorld extends VirtualHelloWorld {
        public void doSth(Object o) {
            System.out.println(o);
        }

        public String toString() {
            return "HelloWorld2";
        }
    }

    private static VirtualHelloWorld instance = new VirtualHelloWorld();

    public static void setInstance() {
        System.out.println("Dummy print to avoid inlining");
        instance = new OverriddenHelloWorld();    
    }

    public static void main(String[] args) {
        setInstance();
        instance.doSth(args[0]);
    }

    @Override
    public String toString() {
        return "Hello World!";
    }

    public void doSth(Object o) {
        System.out.print("Something " + o);
    }
}
