/// When working with multiple universes (native image builds), they are each
/// identified using a string. That name is guaranteed to not contain a comma.
export type UniverseName = string

/// When diffing universes, we have to work with intersections of several
/// universes. Currently, those are represented using a single string,
/// containing comma-separated universe names. For example, "helloworld",
/// "micronaut", and "helloworld,micronaut" are all universe combinations.
export type UniverseCombination = string
export function combinationFromNames(universes: UniverseName[]): UniverseCombination {
    universes.sort()
    return universes.join(',')
}
