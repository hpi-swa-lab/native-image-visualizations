#ifndef HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
#define HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H

#define LOG 0
#define DEBUG_ON_ASSERT_FAIL 0


#define REWRITE_ENABLE 1
// THis option is relevant in order to be able to debug the Java process with the rewriting functionality
#define BREAKPOINTS_ENABLE 1







#ifdef DEBUG_ON_ASSERT_FAIL
#undef assert
#ifdef NDEBUG
#define assert(ignore) ((void)0)
#else

#include <csignal>
#include <sys/types.h>

__attribute__((noreturn))
static void __gripe(const char *_Expr, const char *_File, int _Line, const char *_Func) noexcept
{
    std::cout << "PID: " << getpid() << std::endl;
    raise(SIGSTOP);
    exit(1);
}
#define assert(expr) \
    ((expr) ? (void)0 :\
     __gripe(#expr, __FILE__,__LINE__,__func__))
#endif
#endif // DEBUG_ON_ASSERT_FAIL

#endif //HEAP_ASSIGNMENT_TRACING_AGENT_SETTINGS_H
