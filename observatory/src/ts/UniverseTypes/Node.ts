import { UniverseIndex } from '../SharedTypes/Indexes'
import { Bytes } from '../SharedTypes/Size'
import { HIERARCHY_NAME_SEPARATOR } from '../globals'

export const INVALID_SIZE: Bytes = -1

export class Node {
    protected _name: string
    protected readonly _children: Node[]
    protected _codeSize: Bytes = INVALID_SIZE
    protected _parent: Node | undefined
    protected _occurencesIn: UniverseIndex[] = []

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

    get occurencesIn(): UniverseIndex[] {
        return this._occurencesIn
    }

    set codeSize(size: Bytes) {
        this._codeSize = size
    }

    set occurencesIn(indexes: UniverseIndex[]) {
        this._occurencesIn = indexes
    }

    set parent(newParent: Node | undefined) {
        this._parent = newParent
    }

    public push(...children: Node[]): number {
        for (const child of children) {
            this._children.push(child)
            child.parent = this
        }
        this.codeSize = INVALID_SIZE
        return this.children.length
    }

    public pop(): Node | undefined {
        this.codeSize = INVALID_SIZE
        const toRemove = this._children.pop()
        if (toRemove) {
            toRemove.parent = undefined
        }
        return toRemove
    }

    public splice(start: number, deleteCount?: number | undefined): Node[] {
        this.codeSize = INVALID_SIZE
        const toRemove = this._children.splice(start, deleteCount)
        for (const priorChild of toRemove) {
            priorChild.parent = undefined
        }
        return toRemove
    }

    public equals(another: Node): boolean {
        return (
            this.name === another.name &&
            this.parent === another.parent &&
            this.codeSize == another.codeSize &&
            this.children === another.children
        )
    }

    public is(another: Node): boolean {
        return (
            Object.is(this.name, another.name) &&
            Object.is(JSON.stringify(this.occurencesIn), JSON.stringify(another.occurencesIn)) &&
            Object.is(this.children.length, another.children.length) &&
            this.children.every((child, index) => child.is(another.children[index]))
        )
    }
}
