import { Node } from './Node'
import { MergedNode } from './MergedNode'
import { Universe } from './Universe'
import { UniverseIndex } from '../SharedTypes/Indices'

export class Multiverse {
    private _root: MergedNode
    private _sources: Universe[] = []

    constructor(sources: Universe[]) {
        // this is just for ts initialization. It gets overridden in the sources setter anyways
        this._root = new MergedNode('tmp')

        this.sources = sources
    }

    get sources(): Universe[] {
        return this._sources
    }

    get root(): Node {
        return this._root
    }

    set sources(newSources: Universe[]) {
        this._sources = newSources
        this._root = this.mergeUniverses(...newSources)
    }

    public equals(other: Multiverse): boolean {
        if (!other.root.equals(this.root)) {
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

        universes.forEach((universe, i) => this.mergeNode(mergeResult, universe.root, i))

        return mergeResult
    }

    private mergeNode(mergeResult: MergedNode, node: Node, treeIndex: UniverseIndex) {
        const matchingChild = mergeResult.children.find(
            (child: MergedNode) => child.name == node.name
        )

        if (!matchingChild) {
            const nodeToMerge = MergedNode.fromNode(node)
            this.setSourcesRecursively(nodeToMerge, node, treeIndex)
            mergeResult.push(nodeToMerge)
        } else {
            matchingChild.sources.set(treeIndex, node)
            node.children.forEach((ownChild: Node) =>
                this.mergeNode(matchingChild, ownChild, treeIndex)
            )
        }
    }

    private setSourcesRecursively(copy: MergedNode, original: Node, index: UniverseIndex) {
        copy.sources = new Map([[index, original]])
        copy.children.forEach((child: MergedNode, i: number) =>
            this.setSourcesRecursively(child, original.children[i], index)
        )
    }
}
