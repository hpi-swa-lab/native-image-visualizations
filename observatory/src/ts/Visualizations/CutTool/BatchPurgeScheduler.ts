import {collectCgNodesInSubtree, FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {AsyncCausalityGraph, AsyncIncrementalSimulationResult} from '../../Causality/AsyncCausalityGraph';
import {PurgeTreeNode} from '../../Causality/CausalityGraph';
import {assert} from '../../util/assert';

export interface ReachabilityVector
{
    arr: Uint8Array
    size: number
}

export class BatchPurgeScheduler {
    callback?: (node: FullyHierarchicalNode, data: ReachabilityVector) => void
    private purgedSizeBaseline: number | undefined
    private readonly codesizes: number[]
    private readonly cg: AsyncCausalityGraph
    private readonly prepurgeNodes: FullyHierarchicalNode[]
    private waitlist: FullyHierarchicalNode[] = []
    private runningBatch: AsyncIncrementalSimulationResult | undefined
    private runningIndexToNode: (FullyHierarchicalNode | undefined)[] = []

    constructor(cg: AsyncCausalityGraph, codesizes: number[], purgedSizeBaseline: number | undefined, prepurgeNodes: FullyHierarchicalNode[] = []) {
        this.cg = cg
        this.codesizes = codesizes
        this.purgedSizeBaseline = purgedSizeBaseline
        this.prepurgeNodes = prepurgeNodes
    }

    request(nodes: FullyHierarchicalNode[]) {
        this.waitlist.push(...nodes)
    }

    async next() {
        if (this.runningBatch) {
            const token = await this.runningBatch.simulateNext()
            if (token === undefined) {
                this.runningBatch.delete()
                this.runningBatch = undefined
                return this.waitlist.length > 0
            } else if (token === -1) /* empty purge */ {
                assert(this.purgedSizeBaseline === undefined)
                const stillReachable = await this.runningBatch.getReachableArray()
                let purgedSize = 0
                for (let i = 0; i < this.codesizes.length; i++)
                    if (stillReachable[i] === 0xFF)
                        purgedSize += this.codesizes[i]
                this.purgedSizeBaseline = purgedSize
            } else {
                const node = this.runningIndexToNode[token]
                if (node) {
                    assert(this.purgedSizeBaseline !== undefined)
                    if (this.callback) {
                        const stillReachable = await this.runningBatch.getReachableArray()
                        let purgedSize = -this.purgedSizeBaseline
                        for (let i = 0; i < this.codesizes.length; i++)
                            if (stillReachable[i] === 0xFF)
                                purgedSize += this.codesizes[i]
                        this.callback(node, {arr: stillReachable, size: purgedSize})
                    }
                }
            }
            return true
        } else if (this.waitlist.length > 0) {
            const [tree, nodesByIndex] = createPurgeNodeTree(new Set(this.waitlist), new Set(this.prepurgeNodes))
            assert(tree !== undefined)
            if (this.purgedSizeBaseline === undefined) {
                // We need to insert an empty purge node for calculating the baseline
                assert(tree.children !== undefined)
                tree.children.unshift({token: -1, mids: []})
            }

            this.runningIndexToNode = nodesByIndex
            this.runningBatch = await this.cg.simulatePurgesBatched(tree,
                [...new Set(this.prepurgeNodes)].flatMap(collectCgNodesInSubtree))
            this.waitlist = []
            return true
        } else {
            return false
        }
    }
}

function createPurgeNodeTree(
    queriedNodes: Set<FullyHierarchicalNode>,
    prepurgeNodes = new Set<FullyHierarchicalNode>()):
        [ PurgeTreeNode<number> | undefined, (FullyHierarchicalNode | undefined)[] ] {
    if(queriedNodes.size === 0)
        return [undefined, []]
    const root = findRoot([...queriedNodes][0])

    const interestingNodes = new Set<FullyHierarchicalNode>()

    for(const node of queriedNodes) {
        for(let cur: FullyHierarchicalNode | undefined = node; cur; cur = cur.parent) {
            interestingNodes.add(cur)
        }
    }

    // Find lowest common ancestor
    // Starting the batch from the lowest possible root improves performance
    let lca: FullyHierarchicalNode = root
    while(!queriedNodes.has(lca) && lca.children.filter(c => interestingNodes.has(c)).length == 1) {
        lca = lca.children.find(c => interestingNodes.has(c))!
    }

    const indexToSrcNode: FullyHierarchicalNode[] = []
    const tree = createPurgeNodeTreeRec(
        lca,
        indexToSrcNode,
        v => prepurgeNodes.has(v) ? undefined : interestingNodes.has(v))
    return [tree, indexToSrcNode.map(d => queriedNodes.has(d) ? d : undefined)]
}

function findRoot(node: FullyHierarchicalNode) {
    let cur: FullyHierarchicalNode
    for(cur = node; cur.parent; cur = cur.parent);
    return cur
}

function createPurgeNodeTreeRec(node: FullyHierarchicalNode,
                                indexToSrcNode: FullyHierarchicalNode[],
                                expandCallback: (v: FullyHierarchicalNode) => boolean | undefined)
    : PurgeTreeNode<number> | undefined {

    const root: PurgeTreeNode<number> = { token: indexToSrcNode.length }
    indexToSrcNode.push(node)

    const mids = []
        if(node.cgNode)
            mids.push(node.cgNode)
    const children = []
    for(const child of node.children) {
        const decision = expandCallback(child)
        if (decision === undefined)
            continue;
        if (decision) {
            const childRoot = createPurgeNodeTreeRec(child, indexToSrcNode, expandCallback)
            if (childRoot)
                children.push(childRoot)
        } else {
            mids.push(...collectCgNodesInSubtree(child))
        }
    }

    if (children.length === 0 && mids.length === 0)
        return undefined

    if (mids.length !== 0)
        root.mids = mids

    if (children.length !== 0)
        root.children = children

    return root
}