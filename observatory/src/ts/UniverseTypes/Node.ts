import { Bytes } from '../SharedTypes/Size'
import { HIERARCHY_NAME_SEPARATOR } from '../globals'

export const INVALID_SIZE: Bytes = -1

export class Node {
    protected _name: string
    protected _children: Node[]
    protected _codeSize: Bytes = INVALID_SIZE
    protected _parent: Node | undefined

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

    get children(): Node[] {
        return this._children
    }

    get parent(): Node | undefined {
        return this._parent
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

    get inline(): boolean {
        return this.codeSize <= 0
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

    set codeSize(size: Bytes) {
        this._codeSize = size
    }

    set parent(newParent: Node | undefined) {
        this._parent = newParent
    }

    public append(...nodes: Node[]): number {
        for (const node of nodes) {
            this._children.push(node)
            node.parent = this
        }
        return this.children.length
    }

    public equals(another: Node): boolean {
        return (
            this.name === another.name &&
            this.parent === another.parent &&
            this.codeSize == another.codeSize &&
            this.children === another.children
        )
    }
}
