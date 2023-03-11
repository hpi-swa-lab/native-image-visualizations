# Heap Assignment Tracing Agent

In order for the CausalityExport to be able to figure what happened during
class initialization at build-time, this agent traces heap writes and
accounts them to the currently running class initializer.
Class initializers forcing the initialization of other classes are also recorded.


## Getting started
As this is a CMake project, building it on linux can be done as follows:
```bash
mkdir build && cd build && cmake .. && make
```

The resulting library `./build/libheap_assignment_tracing_agent.so` can then
be specified to the native-image as built inside the submodule `../graal/`
with the option 
```
-H:HeapAssignmentTracingAgentPath=<absolute_path>
```

This is of course only useful together with the option
```
-H:+PrintCausalityGraph
```