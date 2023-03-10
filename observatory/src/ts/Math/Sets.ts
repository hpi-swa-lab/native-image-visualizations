import { VennPartitions, VennSet } from '../SharedTypes/Venn'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from './../UniverseTypes/Node'

export function createVennPartitions(multiverse: Multiverse): VennPartitions {
    const powerSetCache = new Map<string, string[]>()
    const inclusiveCounts = new Map<string, number>()
    const exclusiveCounts = new Map<string, number>()
    multiverse.root.children.forEach(countIn)

    function countIn(node: Node): void {
        const occurences = Array.from(node.sources.keys())
        const intersection = JSON.stringify(occurences)
        exclusiveCounts.set(intersection, (exclusiveCounts.get(intersection) ?? 0) + 1)

        const combinations = hitOrCalculateOnMiss(occurences, intersection, powerSetCache)
        combinations.forEach((combination) =>
            inclusiveCounts.set(combination, (inclusiveCounts.get(combination) ?? 0) + 1)
        )

        node.children.forEach(countIn)
    }

    return {
        inclusive: createVennSets(inclusiveCounts),
        exclusive: createVennSets(exclusiveCounts)
    }
}

// From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
export function powerSet<T>(l: T[]): T[][] {
    return (function ps(list): T[][] {
        if (list.length === 0) {
            return [[]]
        }
        const head: T | undefined = list.pop()
        const tailPS: T[][] = ps(list)
        return tailPS.concat(tailPS.map((e: T[]) => [...e, head as T]))
    })(l.slice())
}

function hitOrCalculateOnMiss(
    combinees: number[],
    key: string,
    cache: Map<string, string[]>
): string[] {
    const subCombinations =
        cache.get(key) ??
        powerSet(combinees)
            .slice(1) // Ignore the empty power set
            .map((combination) => JSON.stringify(combination))

    if (!cache.has(key)) {
        cache.set(key, subCombinations)
    }

    return subCombinations
}

function createVennSets(counts: Map<string, number>): VennSet[] {
    return Array.from(counts, ([combination, count]) => {
        return { sets: JSON.parse(combination), size: count }
    }).sort((a, b) => a.sets.length - b.sets.length)
}
