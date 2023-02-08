import { Node } from '../UniverseTypes/Node'

// From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
export function powerSet(l: unknown[]): unknown[][] {
    return (function ps(list): unknown[][] {
        if (list.length === 0) {
            return [[]]
        }
        const head: unknown = list.pop()
        const tailPS: unknown[][] = ps(list)
        return tailPS.concat(tailPS.map((e: unknown[]) => [...e, head]))
    })(l.slice())
}

export function countIn(
    node: Node,
    exclusiveCounts: Map<string, number>,
    inclusiveCounts: Map<string, number>,
    powerSetCache: Map<string, string[]>
): void {
    const occurences = Array.from(node.sources.keys())
    const intersection = JSON.stringify(occurences)

    exclusiveCounts.set(intersection, (exclusiveCounts.get(intersection) ?? 0) + 1)

    const combinations = hitOrCalculateOnMiss(occurences, intersection, powerSetCache)
    combinations.forEach((combination) =>
        inclusiveCounts.set(combination, (inclusiveCounts.get(combination) ?? 0) + 1)
    )

    node.children.forEach((child: Node) => {
        countIn(child, exclusiveCounts, inclusiveCounts, powerSetCache)
    })
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
