import { Node } from './../UniverseTypes/Node'

export interface VennPartitions {
    inclusive: VennSet[]
    exclusive: VennSet[]
}

export interface VennSet {
    sets: string[]
    size: number
}

export function toVennPartitions(mergedTree: Node): VennPartitions {
    // next todo: from powersets, get number of elements in each bucket and map to venn set
    // the sets are, indeed, inclusive!
    /*
    const sets = [
  { sets: ['A'], size: 12 },
  { sets: ['B'], size: 12 },
  { sets: ['A', 'B'], size: 2 },
    ];

    let solution = venn.venn(sets)
    console.log(solution)
    solution = venn.normalizeSolution(solution, Math.PI / 2, undefined );
    console.log(solution)


    let circles = venn.scaleSolution(solution, 100, 100, 20, null);
    let textCentres = venn.computeTextCentres(circles, sets, false);
    console.log(textCentres)*/

    const powerSetCache = new Map<string, string[]>()
    const inclusiveCounts = new Map<string, number>()
    const exclusiveCounts = new Map<string, number>()
    mergedTree.children.forEach(countIn)

    function countIn(node: Node): void {
        const intersection = JSON.stringify(node.occursIn)
        exclusiveCounts.set(intersection, (exclusiveCounts.get(intersection) ?? 0) + 1)

        const combinations = hitOrCalculateOnMiss(node.occursIn, intersection, powerSetCache)
        combinations.forEach((combination) =>
            inclusiveCounts.set(combination, (inclusiveCounts.get(combination) ?? 0) + 1)
        )

        node.children.forEach(countIn)
    }

    return {
        inclusive: toVennSets(inclusiveCounts),
        exclusive: toVennSets(exclusiveCounts)
    }
}

// From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
export function powerSet(l: unknown[]): unknown[][] {
    return (function ps(list): unknown[][] {
        if (list.length === 0) {
            return [[]]
        }
        const head = list.pop()
        const tailPS = ps(list)
        return tailPS.concat(
            tailPS.map(function (e) {
                return [head].concat(e)
            })
        )
    })(l.slice())
}

function hitOrCalculateOnMiss(combinees: number[], key: string, cache: Map<string, string[]>) {
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

function toVennSets(counts: Map<string, number>): VennSet[] {
    return Array.from(counts, ([combination, count]) => {
        return { sets: JSON.parse(combination), size: count }
    })
}
