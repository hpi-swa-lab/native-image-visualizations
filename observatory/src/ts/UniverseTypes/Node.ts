import { HIERARCHY_NAME_SEPARATOR } from '../globals'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'

export const INVALID_SIZE: Bytes = -1

export class Node {
    protected _name: string
    protected _parent: Node | undefined
    protected readonly _children: Node[]
    protected _codeSize: Bytes = INVALID_SIZE
    protected _occursIn: Map<UniverseIndex, Node> = new Map()

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

    get identifier(): string {
        let path = this.name
        let root: Node | undefined = this.parent
        while (root != undefined) {
            path = root.name + HIERARCHY_NAME_SEPARATOR + path
            root = root.parent
        }
        return path
    }

    get parent(): Node | undefined {
        return this._parent
    }
    set parent(newParent: Node | undefined) {
        this._parent = newParent
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

    get inline(): boolean {
        return this.codeSize <= 0
    }

    get occursIn(): Map<UniverseIndex, Node> {
        return this._occursIn
    }
    set occursIn(occursIn: Map<UniverseIndex, Node>) {
        this._occursIn = occursIn
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
        if (!this.equalsIgnoringChildren(another)) return false
        if (this.children.length !== another.children.length) return false
        for (let i = 0; i < this.children.length; i++) {
            if (!this.children[i].equals(another.children[i])) return false
        }
        return true
    }
    /// Like equals, but only compares the parent chain, not children.
    equalsIgnoringChildren(another: Node): boolean {
        if (
            this.name !== another.name ||
            (this.codeSize !== another.codeSize &&
                new Set(Array.from(this.occursIn.keys())) !==
                    new Set(Array.from(another.occursIn.keys())))
        )
            return false
        if (this.parent === undefined && another.parent === undefined) return true
        if (this.parent === undefined || another.parent === undefined) return false
        return this.parent.equalsIgnoringChildren(another.parent)
    }
}
