export function assert(cond: boolean): asserts cond {
    if(!cond)
        throw new Error('Assertion failed!')
}