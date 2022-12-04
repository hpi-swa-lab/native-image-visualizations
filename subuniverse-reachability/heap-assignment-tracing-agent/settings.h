#ifndef HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
#define HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H

#define LOG 1
#define DEBUG_ON_ASSERT_FAIL 0


#define REWRITE_ENABLE 1
// THis option is relevant in order to be able to debug the Java process with the rewriting functionality
#define BREAKPOINTS_ENABLE 1






#include <csignal>
#include <sys/types.h>

static void start_debugging()
{
    std::cout << "PID: " << getpid() << std::endl;
    raise(SIGSTOP);
}

#if DEBUG_ON_ASSERT_FAIL
#undef assert
#ifdef NDEBUG
#define assert(ignore) ((void)0)
#else

__attribute__((noreturn))
static void __gripe(const char *_Expr, const char *_File, int _Line, const char *_Func) noexcept
{
    start_debugging();
    exit(1);
}
#define assert(expr) \
    ((expr) ? (void)0 :\
     __gripe(#expr, __FILE__,__LINE__,__func__))
#endif
#else // DEBUG_ON_ASSERT_FAIL
#include <cassert>
#endif


#endif //HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
