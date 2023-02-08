import { Node } from './Node'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'
import clone from 'clone'

export const INVALID_SIZE: Bytes = -1

export class MergedNode extends Node {
    protected _parent: MergedNode | undefined
    protected _children: MergedNode[]
    protected _sources: Map<UniverseIndex, Node> = new Map()

    constructor(
        name: string,
        children: MergedNode[] = [],
        parent: MergedNode | undefined = undefined,
        codeSize = INVALID_SIZE
    ) {
        super(name, [], undefined, codeSize)

        this._children = children
        this._parent = parent
    }

    get parent(): MergedNode | undefined {
        return this._parent
    }

    get children(): MergedNode[] {
        return this._children
    }

    get sources(): Map<UniverseIndex, Node> {
        return this._sources
    }

    set sources(sources: Map<UniverseIndex, Node>) {
        this._sources = sources
    }

    set parent(newParent: MergedNode | undefined) {
        this._parent = newParent
    }

    set children(newChildren: MergedNode[]) {
        this._children = newChildren
    }

    static fromNode(node: Node, parent: MergedNode | undefined = undefined): MergedNode {
        const result = new MergedNode(node.name, [], parent, node.codeSize)

        result.children = node.children.map((child: Node) => MergedNode.fromNode(child, result))

        return result
    }

    public clone(): MergedNode {
        const parent = this.parent
        this.parent = undefined

        const newInstance = clone(this)

        newInstance.parent = parent
        this.parent = parent

        return newInstance
    }

    public push(...children: MergedNode[]): number {
        for (const child of children) {
            this._children.push(child)
            child.parent = this
        }
        this._codeSize = INVALID_SIZE
        return this.children.length
    }

    public pop(): MergedNode | undefined {
        this._codeSize = INVALID_SIZE
        const toRemove = this._children.pop()
        if (toRemove) {
            toRemove.parent = undefined
        }
        return toRemove
    }

    public splice(start: number, deleteCount?: number | undefined): MergedNode[] {
        this._codeSize = INVALID_SIZE
        const toRemove = this._children.splice(start, deleteCount)
        for (const priorChild of toRemove) {
            priorChild.parent = undefined
        }
        return toRemove
    }

    protected equalsIgnoringParents(another: MergedNode) {
        if (!super.equalsIgnoringParents(another)) {
            return false
        }

        const sources = Array.from(this.sources.entries())
        return sources.every(([index, node]) => {
            const other = another.sources.get(index)
            return other && node.name === other.name && node.equals(other)
        })
    }
}
