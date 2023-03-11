cmake_minimum_required(VERSION 3.22)
project(causality-query-native)

set(CMAKE_CXX_STANDARD 20)

include_directories(src/include)

include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG("-march=native" COMPILER_SUPPORTS_MARCH_NATIVE)
if(COMPILER_SUPPORTS_MARCH_NATIVE)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native")
endif()

add_executable(causality-query main.cpp src/model.h src/Bitset.h src/analysis.h src/input.h src/reachability.h)