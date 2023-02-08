import { Node } from './Node'
import { Universe } from './Universe'
import { UniverseIndex } from '../SharedTypes/Indices'
import { VennPartitions, VennSet } from '../SharedTypes/Venn'
import { countIn } from '../Math/Sets'

export class Multiverse {
    private _root: Node
    private _sources: Universe[] = []

    constructor(sources: Universe[]) {
        // this is just for ts initialization. It gets overridden in the sources setter anyways
        this._root = new Node('tmp')

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

    public toVennPartitions(multiverse: Multiverse): VennPartitions {
        const powerSetCache = new Map<string, string[]>()

        const exclusiveCounts = new Map<string, number>()
        const inclusiveCounts = new Map<string, number>()

        multiverse.root.children.forEach((child: Node) => {
            countIn(child, exclusiveCounts, inclusiveCounts, powerSetCache)
        })

        return {
            inclusive: this.createVennSets(inclusiveCounts),
            exclusive: this.createVennSets(exclusiveCounts)
        }
    }

    protected createVennSets(counts: Map<string, number>): VennSet[] {
        return Array.from(counts, ([combination, count]) => {
            return { sets: JSON.parse(combination), size: count }
        }).sort((a, b) => a.sets.length - b.sets.length)
    }

    protected mergeUniverses(...universes: Universe[]): Node {
        const mergeResult: Node = new Node('')

        universes.forEach((universe, i) => this.mergeNode(mergeResult, universe.root, i))

        return mergeResult
    }

    protected mergeNode(mergeResult: Node, node: Node, treeIndex: UniverseIndex) {
        const matchingChild = mergeResult.children.find((child: Node) => child.name == node.name)

        if (!matchingChild) {
            const nodeToMerge = node.clone()
            this.setSourcesRecursively(nodeToMerge, node, treeIndex)
            mergeResult.push(nodeToMerge)
        } else {
            matchingChild.sources.set(treeIndex, node)
            node.children.forEach((ownChild: Node) =>
                this.mergeNode(matchingChild, ownChild, treeIndex)
            )
        }
    }

    protected setSourcesRecursively(copy: Node, original: Node, index: UniverseIndex) {
        copy.sources = new Map([[index, original]])
        copy.children.forEach((child: Node, i: number) =>
            this.setSourcesRecursively(child, original.children[i], index)
        )
    }
}
