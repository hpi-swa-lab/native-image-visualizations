import { Node } from './Node'
import { MergedNode } from './MergedNode'
import { Universe } from './Universe'
import { UniverseIndex } from '../SharedTypes/Indices'

export class Multiverse {
    private _mergedNode: MergedNode
    private _sources: Universe[] = []

    constructor(sources: Universe[]) {
        // this is just for ts initialization. It gets overridden in the sources setter anyways
        this._mergedNode = new MergedNode('tmp')

        this.sources = sources
    }

    get sources(): Universe[] {
        return this._sources
    }

    get mergedNode(): Node {
        return this._mergedNode
    }

    set sources(newSources: Universe[]) {
        this._sources = newSources
        this._mergedNode = this.mergeUniverses(...newSources)
    }

    public equals(other: Multiverse): boolean {
        if (!other.mergedNode.equals(this.mergedNode)) {
            return false
        }

        const mySources = this.sources
        const theirSources = other.sources

        if (theirSources.length !== mySources.length) {
            return false
        }

        for (let i = 0; i < mySources.length; i++) {
            if (mySources[i].name !== theirSources[i].name) {
                return false
            }

            if (!mySources[i].root.equals(theirSources[i].root)) {
                return false
            }
        }

        return true
    }

    private mergeUniverses(...universes: Universe[]): MergedNode {
        const mergeResult: MergedNode = new MergedNode('')

        universes.forEach((universe, i) => this.mergeNode(mergeResult, universe.root, i, universe))

        return mergeResult
    }

    private mergeNode(
        mergeResult: MergedNode,
        node: Node,
        treeIndex: UniverseIndex,
        universe: Universe
    ) {
        const matchingChild = mergeResult.children.find(
            (child: MergedNode) => child.name == node.name
        )

        if (!matchingChild) {
            const nodeToMerge = MergedNode.fromNode(node)
            this.setOccursInRecursive(nodeToMerge, node, treeIndex, universe)
            mergeResult.push(nodeToMerge)
        } else {
            matchingChild.occursIn.set(treeIndex, universe)
            node.children.forEach((ownChild: Node) =>
                this.mergeNode(matchingChild, ownChild, treeIndex, universe)
            )
        }
    }

    private setOccursInRecursive(
        copy: MergedNode,
        original: Node,
        index: UniverseIndex,
        universe: Universe
    ) {
        copy.occursIn = new Map([[index, universe]])
        copy.children.forEach((child: MergedNode, i: number) =>
            this.setOccursInRecursive(child, original.children[i], index, universe)
        )
    }
}
