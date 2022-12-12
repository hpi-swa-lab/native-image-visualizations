cmake_minimum_required(VERSION 3.24)
project(causality_graph)

set(CMAKE_CXX_STANDARD 20)

find_package(Boost REQUIRED COMPONENTS container)
include_directories(${Boost_INCLUDE_DIRS})

add_executable(causality_graph main.cpp)
