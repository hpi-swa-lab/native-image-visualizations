import { HIERARCHY_NAME_SEPARATOR } from '../globals'
import { mapEquals } from '../Math/Maps'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'

export const INVALID_SIZE: Bytes = -1

export class Node {
    protected _name: string
    protected _parent: Node | undefined
    protected _children: Node[]
    protected _codeSize: Bytes = INVALID_SIZE
    protected _sources: Map<UniverseIndex, Node> = new Map()
    protected _identifier: string | undefined

    constructor(
        name: string,
        children: Node[] = [],
        parent: Node | undefined = undefined,
        codeSize = INVALID_SIZE
    ) {
        this._name = name
        this._children = children
        for (const child of children) {
            child.parent = this
        }
        this._parent = parent
        this._codeSize = codeSize
    }

    get name(): string {
        return this._name
    }

    // todo
    get isReflective(): boolean {
        return this.children.some((child) => child.isReflective)
    }

    get isJni(): boolean {
        return this.children.some((child) => child.isJni)
    }

    get isSynthetic(): boolean {
        return this.children.some((child) => child.isSynthetic)
    }

    get identifier(): string {
        if (this._identifier) return this._identifier

        this._identifier = this.name
        if (this.parent) {
            this._identifier = this.parent.identifier + HIERARCHY_NAME_SEPARATOR + this.name
        }
        return this._identifier
    }

    get parent(): Node | undefined {
        return this._parent
    }

    get children(): Node[] {
        return this._children
    }

    get codeSize(): Bytes {
        if (this._codeSize == INVALID_SIZE) {
            this._codeSize = this.children.reduce(
                (partialSize, child) => partialSize + child.codeSize,
                0
            )
        }
        return this._codeSize
    }

    /**
     * Use only in the context of Multiverses.
     * @see {@link Multiverse}
     *
     * @return {Map<UniverseIndex, Node>}
     * the sources from which this (merged) node was constructed
     */
    get sources(): Map<UniverseIndex, Node> {
        return this._sources
    }

    /**
     * Use only in the context of Multiverses.
     * @see {@link Multiverse}
     *
     * @param {Map<UniverseIndex, Node>} sources
     * the nodes from which this (merged) node was constructed
     */
    set sources(sources: Map<UniverseIndex, Node>) {
        this._sources = sources
    }

    set parent(newParent: Node | undefined) {
        this._parent = newParent
    }

    public push(...children: Node[]): number {
        for (const child of children) {
            this._children.push(child)
            child.parent = this
        }
        this._codeSize = INVALID_SIZE
        return this.children.length
    }

    public pop(): Node | undefined {
        this._codeSize = INVALID_SIZE
        const toRemove = this._children.pop()
        if (toRemove) {
            toRemove.parent = undefined
        }
        return toRemove
    }

    public splice(start: number, deleteCount?: number | undefined): Node[] {
        this._codeSize = INVALID_SIZE
        const toRemove = this._children.splice(start, deleteCount)
        for (const priorChild of toRemove) {
            priorChild.parent = undefined
        }
        return toRemove
    }

    public equals(another: Node): boolean {
        return (
            this === another ||
            (this.equalsComparingOnlyParents(another) && this.equalsIgnoringParents(another))
        )
    }

    public clonePrimitive(): Node {
        return new Node(this.name, [], undefined, this._codeSize)
    }

    protected equalsIgnoringParents(another: Node): boolean {
        return (
            this.name === another.name &&
            this.codeSize === another.codeSize &&
            this.children.length === another.children.length &&
            this.children.every((child: Node, index: number) =>
                child.equalsIgnoringParents(another.children[index])
            ) &&
            mapEquals(this.sources, another.sources, (a, b) => a.equals(b))
        )
    }

    protected equalsComparingOnlyParents(another: Node): boolean {
        if (this.parent === undefined && another.parent === undefined) return true
        if (this.parent === undefined || another.parent === undefined) return false
        return (
            this.parent.name == another.parent.name &&
            this.parent.equalsComparingOnlyParents(another.parent)
        )
    }
}
