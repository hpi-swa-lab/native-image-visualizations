cmake_minimum_required(VERSION 3.22)
project(heap_assignment_tracing_agent)

set(CMAKE_CXX_STANDARD 20)

include_directories(/usr/lib/jvm/graalvm-ce-java17-22.3.0/include/ /usr/lib/jvm/graalvm-ce-java17-22.3.0/include/linux/)

add_library(heap_assignment_tracing_agent SHARED main.cpp)
