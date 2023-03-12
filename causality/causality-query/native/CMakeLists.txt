cmake_minimum_required(VERSION 3.22)
project(causality-query-native)

set(CMAKE_CXX_STANDARD 20)

include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG("-march=native" COMPILER_SUPPORTS_MARCH_NATIVE)
if(COMPILER_SUPPORTS_MARCH_NATIVE)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native")
endif()

add_executable(causality-query main.cpp ../shared/model.h ../shared/Bitset.h ../shared/analysis.h ../shared/input.h ../shared/reachability.h)