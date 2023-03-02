cmake_minimum_required(VERSION 3.22)
project(causality_graph)

set(CMAKE_CXX_STANDARD 20)

if(EXISTS ${BoostIncludeDir})
    include_directories(${BoostIncludeDir})
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sALLOW_TABLE_GROWTH -s ALLOW_MEMORY_GROWTH=1 -I. -s EXPORTED_RUNTIME_METHODS='[\"cwrap\", \"allocateUTF8\", \"addFunction\", \"removeFunction\"]' -s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\"]'")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -s EXPORT_ES6=1 -s EXPORT_NAME=loadWASM --bind")

    #set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -fexceptions")
    #set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sASSERTIONS=1 -fexceptions")
else()
    find_package(Boost REQUIRED container)
    include_directories(${Boost_INCLUDE_DIRS})
endif()


include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG("-march=native" COMPILER_SUPPORTS_MARCH_NATIVE)
if(COMPILER_SUPPORTS_MARCH_NATIVE)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native")
endif()

if(EXISTS ${BoostIncludeDir})
    add_executable(causality_graph web-main.cpp model.h Bitset.h analysis.h input.h reachability.h)
else()
    add_executable(causality_graph main.cpp model.h Bitset.h analysis.h input.h reachability.h)
endif()