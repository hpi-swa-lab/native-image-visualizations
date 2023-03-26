import {
    collectCgNodesInSubtree,
    FullyHierarchicalNode
} from '../../UniverseTypes/CausalityGraphUniverse'
import {
    AsyncCausalityGraph,
    AsyncIncrementalSimulationResult
} from '../../Causality/AsyncCausalityGraph'
import { PurgeTreeNode, Unreachable } from '../../Causality/CausalityGraph'
import { assert } from '../../util/assert'

/*
 * The native WASM module expects a hierachical plan of nodes
 * for which we want the purge-info calculated.
 *
 * With this class, we can simply request the calculation for individual nodes,
 * and the BatchPurgeScheduler cares for combining multiple nodes to a request.
 */

export class PurgeResults {
    // Indexed by cg nodes, contains 0xFF iff the node is not reachable
    private readonly reachableArr: Uint8Array

    constructor(reachableArr: Uint8Array) {
        this.reachableArr = reachableArr
    }

    isPurged(v: FullyHierarchicalNode): boolean {
        return v.cgNode !== undefined && this.reachableArr[v.cgNode] === Unreachable
    }

    scalarProduct(codesizes: number[]): number {
        let sum = 0
        assert(this.reachableArr.length == codesizes.length)
        for (let i = 0; i < codesizes.length; i++)
            if (this.reachableArr[i] === Unreachable) sum += codesizes[i]
        return sum
    }

    accumulatedSizeOfPurgedNodes(vs: NodeSet) {
        const cgNodes = vs.cgNodes
        const sizes = vs.sizes
        assert(cgNodes.length === sizes.length)
        let sum = 0
        for (let i = 0; i < cgNodes.length; i++) {
            if (this.reachableArr[cgNodes[i]] === Unreachable) sum += sizes[i]
        }
        return sum
    }

    allPurged(vs: NodeSet) {
        const cgNodes = vs.cgNodes
        const sizes = vs.sizes
        assert(cgNodes.length === sizes.length)
        for (let i = 0; i < cgNodes.length; i++) {
            if (this.reachableArr[cgNodes[i]] !== Unreachable) return false
        }
        return true
    }
}

export class ReachabilityVector {
    public readonly results: PurgeResults
    // Precomputed sum of the codesizes of all reachable nodes
    public readonly size: number

    constructor(results: PurgeResults, codesizes: number[]) {
        this.results = results
        this.size = results.scalarProduct(codesizes)
    }
}

export class NodeSet {
    /*
     * This is performance-critical as it directly affects the responsibility of the hover-purge
     * effect.
     *
     * Splitting the information into two homogeneous arrays makes the operation really fast
     * (x10 performance on chrome). It might be the layout that enables the JIT to recognize
     * the operation as the primitive thing it is and generate similar-to-native code.
     */
    public readonly cgNodes: number[]
    public readonly sizes: number[]

    constructor(vs: FullyHierarchicalNode[]) {
        const set = vs.filter((v) => v.cgNode !== undefined) as (FullyHierarchicalNode & {
            cgNode: number
        })[]
        this.cgNodes = new Array(set.length)
        this.sizes = new Array(set.length)

        for (let i = 0; i < set.length; i++) {
            this.cgNodes[i] = set[i].cgNode
            this.sizes[i] = set[i].size
        }
    }
}

export class BatchPurgeScheduler {
    callback?: (node: FullyHierarchicalNode | undefined, data: PurgeResults) => void

    private readonly cg: AsyncCausalityGraph
    private readonly prepurgeNodes: FullyHierarchicalNode[]
    private waitlist: FullyHierarchicalNode[] = []
    private runningBatch: AsyncIncrementalSimulationResult | undefined
    private runningIndexToNode: (FullyHierarchicalNode | undefined)[] = []

    private calcBaselineFirst: boolean

    constructor(cg: AsyncCausalityGraph, prepurgeNodes: FullyHierarchicalNode[] = []) {
        this.cg = cg
        this.prepurgeNodes = prepurgeNodes
        this.calcBaselineFirst = prepurgeNodes.length > 0
    }

    request(nodes: FullyHierarchicalNode[]) {
        this.waitlist.push(...nodes)
    }

    async next() {
        if (this.runningBatch) {
            const result = await this.runningBatch.simulateNext()
            if (result === undefined) {
                this.runningBatch.delete()
                this.runningBatch = undefined
                return this.waitlist.length > 0
            } else {
                let node: FullyHierarchicalNode | undefined
                if (result.token === -1) {
                    assert(this.calcBaselineFirst)
                    this.calcBaselineFirst = false
                    node = undefined
                } else {
                    node = this.runningIndexToNode[result.token]
                    if (node === undefined) return true
                    assert(!this.calcBaselineFirst)
                }

                if (this.callback) {
                    const stillReachable = result.history
                    this.callback(node, new PurgeResults(stillReachable))
                }
            }
            return true
        } else if (this.waitlist.length > 0) {
            const [tree, nodesByIndex] = createPurgeNodeTree(
                new Set(this.waitlist),
                new Set(this.prepurgeNodes)
            )

            if (tree) {
                if (this.calcBaselineFirst) {
                    // We need to insert an empty purge node for calculating the baseline
                    assert(tree.children !== undefined)
                    tree.children.unshift({ token: -1, mids: [] })
                }

                this.runningIndexToNode = nodesByIndex
                this.runningBatch = await this.cg.simulatePurgesBatched(
                    tree,
                    [...new Set(this.prepurgeNodes)].flatMap(collectCgNodesInSubtree)
                )
            }
            this.waitlist = []
            return true
        } else {
            return false
        }
    }
}

function createPurgeNodeTree(
    queriedNodes: Set<FullyHierarchicalNode>,
    prepurgeNodes = new Set<FullyHierarchicalNode>()
): [PurgeTreeNode<number> | undefined, (FullyHierarchicalNode | undefined)[]] {
    if (queriedNodes.size === 0) return [undefined, []]
    const root = findRoot([...queriedNodes][0])

    const interestingNodes = new Set<FullyHierarchicalNode>()

    for (const node of queriedNodes) {
        for (let cur: FullyHierarchicalNode | undefined = node; cur; cur = cur.parent) {
            interestingNodes.add(cur)
        }
    }

    // Find lowest common ancestor
    // Starting the batch from the lowest possible root improves performance
    let lca: FullyHierarchicalNode = root
    while (
        !queriedNodes.has(lca) &&
        lca.children.filter((c) => interestingNodes.has(c)).length == 1
    ) {
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
        lca = lca.children.find((c) => interestingNodes.has(c))!
    }

    const indexToSrcNode: FullyHierarchicalNode[] = []
    const tree = createPurgeNodeTreeRec(lca, indexToSrcNode, (v) =>
        prepurgeNodes.has(v) ? undefined : interestingNodes.has(v)
    )
    return [tree, indexToSrcNode.map((d) => (queriedNodes.has(d) ? d : undefined))]
}

function findRoot(node: FullyHierarchicalNode) {
    let cur: FullyHierarchicalNode
    for (cur = node; cur.parent; cur = cur.parent);
    return cur
}

function createPurgeNodeTreeRec(
    node: FullyHierarchicalNode,
    indexToSrcNode: FullyHierarchicalNode[],
    expandCallback: (v: FullyHierarchicalNode) => boolean | undefined
): PurgeTreeNode<number> | undefined {
    const root: PurgeTreeNode<number> = { token: indexToSrcNode.length }
    indexToSrcNode.push(node)

    const mids = []
    if (node.cgNode) mids.push(node.cgNode)
    const children = []
    for (const child of node.children) {
        const decision = expandCallback(child)
        if (decision === undefined) continue
        if (decision) {
            const childRoot = createPurgeNodeTreeRec(child, indexToSrcNode, expandCallback)
            if (childRoot) children.push(childRoot)
        } else {
            mids.push(...collectCgNodesInSubtree(child))
        }
    }

    if (children.length === 0 && mids.length === 0) return undefined

    if (mids.length !== 0) root.mids = mids

    if (children.length !== 0) root.children = children

    return root
}
