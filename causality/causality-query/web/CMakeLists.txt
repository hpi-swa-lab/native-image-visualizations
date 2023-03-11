cmake_minimum_required(VERSION 3.22)
project(causality-query-web)

set(CMAKE_CXX_STANDARD 20)

include_directories(src/include)
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sALLOW_TABLE_GROWTH -s ALLOW_MEMORY_GROWTH=1 -I. -s EXPORTED_RUNTIME_METHODS='[\"cwrap\", \"allocateUTF8\", \"addFunction\", \"removeFunction\"]' -s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\"]'")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -s EXPORT_ES6=1 -s EXPORT_NAME=loadWASM -s MODULARIZE")

#set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fexceptions")
#set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sASSERTIONS=1 -fexceptions")

add_executable(causality-query main.cpp src/model.h src/Bitset.h src/analysis.h src/input.h src/reachability.h)