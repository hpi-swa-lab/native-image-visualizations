cmake_minimum_required(VERSION 3.24)
project(causality_graph)

set(CMAKE_CXX_STANDARD 20)

find_package(Boost REQUIRED COMPONENTS container)
include_directories(${Boost_INCLUDE_DIRS})

include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG("-march=native" COMPILER_SUPPORTS_MARCH_NATIVE)
if(COMPILER_SUPPORTS_MARCH_NATIVE)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native")
endif()

add_executable(causality_graph main.cpp)
