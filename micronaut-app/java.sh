java -agentpath:../subuniverse-reachability/heap-assignment-tracing-agent/cmake-build-release/libheap_assignment_tracing_agent.so -cp /home/christoph/MPWS2022RH1/micronaut-app/target/micronautguide-0.1.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-core-reactive/3.7.2/micronaut-core-reactive-3.7.2.jar:/home/christoph/.m2/repository/log4j/log4j/1.2.17/log4j-1.2.17.jar:/home/christoph/.m2/repository/io/netty/netty-resolver/4.1.82.Final/netty-resolver-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-buffer-netty/3.7.2/micronaut-buffer-netty-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-inject/3.7.2/micronaut-inject-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http-server-netty/3.7.2/micronaut-http-server-netty-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http-client/3.7.2/micronaut-http-client-3.7.2.jar:/home/christoph/.m2/repository/jakarta/annotation/jakarta.annotation-api/2.1.1/jakarta.annotation-api-2.1.1.jar:/home/christoph/.m2/repository/io/netty/netty-codec-http2/4.1.82.Final/netty-codec-http2-4.1.82.Final.jar:/home/christoph/.m2/repository/org/slf4j/slf4j-api/1.7.36/slf4j-api-1.7.36.jar:/home/christoph/.m2/repository/com/fasterxml/jackson/core/jackson-annotations/2.13.4/jackson-annotations-2.13.4.jar:/home/christoph/.m2/repository/io/netty/netty-common/4.1.82.Final/netty-common-4.1.82.Final.jar:/home/christoph/.m2/repository/com/fasterxml/jackson/core/jackson-core/2.13.4/jackson-core-2.13.4.jar:/home/christoph/.m2/repository/jakarta/inject/jakarta.inject-api/2.0.1/jakarta.inject-api-2.0.1.jar:/home/christoph/.m2/repository/javax/validation/validation-api/2.0.1.Final/validation-api-2.0.1.Final.jar:/home/christoph/.m2/repository/io/netty/netty-buffer/4.1.82.Final/netty-buffer-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/serde/micronaut-serde-api/1.3.2/micronaut-serde-api-1.3.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-context/3.7.2/micronaut-context-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-core/3.7.2/micronaut-core-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-jackson-core/3.7.2/micronaut-jackson-core-3.7.2.jar:/home/christoph/.m2/repository/org/yaml/snakeyaml/1.32/snakeyaml-1.32.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-validation/3.7.2/micronaut-validation-3.7.2.jar:/home/christoph/.m2/repository/io/netty/netty-handler/4.1.82.Final/netty-handler-4.1.82.Final.jar:/home/christoph/.m2/repository/javax/annotation/javax.annotation-api/1.3.2/javax.annotation-api-1.3.2.jar:/home/christoph/.m2/repository/io/netty/netty-transport-native-unix-common/4.1.82.Final/netty-transport-native-unix-common-4.1.82.Final.jar:/home/christoph/.m2/repository/io/netty/netty-handler-proxy/4.1.82.Final/netty-handler-proxy-4.1.82.Final.jar:/home/christoph/.m2/repository/io/netty/netty-codec-socks/4.1.82.Final/netty-codec-socks-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/serde/micronaut-serde-support/1.3.2/micronaut-serde-support-1.3.2.jar:/home/christoph/.m2/repository/ch/qos/logback/logback-core/1.2.11/logback-core-1.2.11.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-websocket/3.7.2/micronaut-websocket-3.7.2.jar:/home/christoph/.m2/repository/io/netty/netty-codec-http/4.1.82.Final/netty-codec-http-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-aop/3.7.2/micronaut-aop-3.7.2.jar:/home/christoph/.m2/repository/io/projectreactor/reactor-core/3.4.23/reactor-core-3.4.23.jar:/home/christoph/.m2/repository/io/netty/netty-transport/4.1.82.Final/netty-transport-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/serde/micronaut-serde-jackson/1.3.2/micronaut-serde-jackson-1.3.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http-client-core/3.7.2/micronaut-http-client-core-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http-server/3.7.2/micronaut-http-server-3.7.2.jar:/home/christoph/.m2/repository/ch/qos/logback/logback-classic/1.2.11/logback-classic-1.2.11.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http/3.7.2/micronaut-http-3.7.2.jar:/home/christoph/.m2/repository/org/reactivestreams/reactive-streams/1.0.4/reactive-streams-1.0.4.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-http-netty/3.7.2/micronaut-http-netty-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-runtime/3.7.2/micronaut-runtime-3.7.2.jar:/home/christoph/.m2/repository/io/netty/netty-codec/4.1.82.Final/netty-codec-4.1.82.Final.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-json-core/3.7.2/micronaut-json-core-3.7.2.jar:/home/christoph/.m2/repository/io/micronaut/micronaut-router/3.7.2/micronaut-router-3.7.2.jar example.micronaut.Application