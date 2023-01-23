#ifndef HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
#define HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H

#include <cassert>

#define LOG 0
#define PRINT_CLINIT_HEAP_WRITES 1
//#define SHOW_EXISTING /* 0 to only show non-existing query results, 1 to only show existing query results


#define REWRITE_ENABLE 1
// THis option is relevant in order to be able to debug the Java process with the rewriting functionality
#define BREAKPOINTS_ENABLE 1

#define HOOK_CLASS_NAME "HeapAssignmentTracingHooks"

#endif //HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
