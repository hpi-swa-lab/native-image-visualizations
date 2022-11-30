cmake_minimum_required(VERSION 3.22)
project(heap_assignment_tracing_agent)

set(JAVA_AWT_LIBRARY NotNeeded)
set(JAVA_AWT_INCLUDE_PATH NotNeeded)
find_package(JNI REQUIRED)
include_directories(${JNI_INCLUDE_DIRS})

set(CMAKE_CXX_STANDARD 20)

add_library(heap_assignment_tracing_agent SHARED main.cpp)
