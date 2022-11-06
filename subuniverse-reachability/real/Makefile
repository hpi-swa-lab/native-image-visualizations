run_net_example: ../../samples/virtual-helloworld/VirtualHelloWorld.class ../../samples/virtual-helloworld/VirtualHelloWorld$$OverriddenHelloWorld.class .graal_built
	echo "java.net.URL.getHostAddress()" | python3 execute-ni.py -cp "../../samples/virtual-helloworld/" VirtualHelloWorld

run_virtual_example: ../../samples/virtual-helloworld/VirtualHelloWorld.class ../../samples/virtual-helloworld/VirtualHelloWorld$$OverriddenHelloWorld.class .graal_built
	echo "VirtualHelloWorld.setInstance()" | python3 execute-ni.py -cp "../../samples/virtual-helloworld/" VirtualHelloWorld

../../samples/virtual-helloworld/VirtualHelloWorld.class:
	javac ../../samples/virtual-helloworld/VirtualHelloWorld.java

../../samples/virtual-helloworld/VirtualHelloWorld$$OverriddenHelloWorld.class:
	javac ../../samples/virtual-helloworld/VirtualHelloWorld.java

.graal_built:
	mx -p ../graal/substratevm build
	touch .graal_built