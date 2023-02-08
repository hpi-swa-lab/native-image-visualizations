import { HIERARCHY_NAME_SEPARATOR } from '../globals'
import { Bytes } from '../SharedTypes/Size'
import clone from 'clone'

export const INVALID_SIZE: Bytes = -1

export class Node {
    protected _name: string
    protected _parent: Node | undefined
    protected readonly _children: Node[]
    protected _codeSize: Bytes = INVALID_SIZE

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
        let parent: Node | undefined = this.parent
        while (parent != undefined) {
            path = parent.name + HIERARCHY_NAME_SEPARATOR + path
            parent = parent.parent
        }
        return path
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

    set parent(newParent: Node | undefined) {
        this._parent = newParent
    }

    public clone(): Node {
        const parent = this.parent
        this.parent = undefined

        const newInstance = clone(this)

        newInstance.parent = parent
        this.parent = parent

        return newInstance
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

    protected equalsIgnoringParents(another: Node): boolean {
        if (this.name !== another.name) {
            return false
        }
        if (this.codeSize !== another.codeSize) {
            return false
        }

        if (this.children.length !== another.children.length) {
            return false
        }
        if (
            !this.children.every((child: Node, index: number) =>
                child.equalsIgnoringParents(another.children[index])
            )
        ) {
            return false
        }

        return true
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
