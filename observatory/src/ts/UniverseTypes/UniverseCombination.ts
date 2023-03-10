import { UniverseIndex } from '../SharedTypes/Indices'

export type UniverseCombination = string

export function indicesAsUniverseCombination(indices: UniverseIndex[]): UniverseCombination {
    return indices.sort().join(',')
}

export function universeCombinationAsIndices(combination: UniverseCombination): UniverseIndex[] {
    return combination.split(',').map((index) => parseInt(index))
}
