import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'
import { Multiverse, universeCombination, UniverseCombination } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'

export type ExclusiveSizes = Map<UniverseCombination, Bytes>

export function computeExclusiveSizes(multiverse: Multiverse): Map<Node, ExclusiveSizes> {
    const indices = multiverse.sources.map((_, i) => i)
    const exclusiveSizes = new Map<Node, ExclusiveSizes>()
    computeExclusiveSizesRec(exclusiveSizes, indices, multiverse.root)
    return exclusiveSizes
}
function computeExclusiveSizesRec(
    allExclusiveSizes: Map<Node, ExclusiveSizes>,
    universeIndices: UniverseIndex[],
    mergedNode: Node
) {
    const exclusiveSizesOfThisNode = new Map<UniverseCombination, Bytes>()

    if (mergedNode.children.length == 0) {
        // At the lowest level in the tree, the concept of code shared between
        // universes becomes a bit blurry. For example, a method `foo` may have
        // a code size of 300 bytes in universe A and only 120 bytes in universe
        // B. Now, what amount of code is shared? The correct answer is that we
        // can't tell – the method may have a completely different
        // implementation, or perhaps it's the same code but the GraalVM
        // analysis had a bit more information about type flows and was able to
        // simplify the code.
        //
        // It would make no sense to treat the implementation of methods as
        // entirely different (this would make the visualization useless), but
        // it also doesn't make sense to treat the unioned code size as being in
        // all universes – after all, a smaller universe should be reported to
        // be smaller.
        //
        // What we do here is a "share-as-much-as-is-reasonable" approach: Let's
        // say there's a method with the following code sizes in three
        // universes:
        //
        // - 20 bytes in universe A
        // - 50 bytes in universe B
        // - 80 bytes in universe C
        //
        // We treat the minimum size (20 bytes) as being shared among all
        // universes. We then repeat this process for the universes that still
        // contain more code with the remaining code sizes. Finally, we end up
        // with this result:
        //
        // - 20 bytes shared among A, B, and C
        // - 30 bytes shared among B and C
        // - 30 bytes exclusively in C

        const remainingSizes = new Map()
        for (const index of universeIndices) {
            remainingSizes.set(index, mergedNode.sources.get(index)?.codeSize ?? 0)
        }

        while (true) {
            for (const [index, size] of remainingSizes.entries()) {
                if (size == 0) {
                    remainingSizes.delete(index)
                }
            }
            if (remainingSizes.size == 0) {
                break
            }

            const minimum = Array.from(remainingSizes.values()).reduce((a, b) => Math.min(a, b))
            const combination = universeCombination(Array.from(remainingSizes.keys()))
            exclusiveSizesOfThisNode.set(combination, minimum)

            for (const index of remainingSizes.keys()) {
                remainingSizes.set(index, remainingSizes.get(index) - minimum)
            }
        }
    } else {
        mergedNode.children.forEach((child: Node) =>
            computeExclusiveSizesRec(allExclusiveSizes, universeIndices, child)
        )

        for (const child of mergedNode.children) {
            // The exclusive sizes are calculated for all nodes.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            allExclusiveSizes.get(child)!.forEach((size, combination) => {
                exclusiveSizesOfThisNode.set(
                    combination,
                    (exclusiveSizesOfThisNode.get(combination) ?? 0) + size
                )
            })
        }
    }

    allExclusiveSizes.set(mergedNode, exclusiveSizesOfThisNode)
}
