import { Node } from './Node'

export class Universe {
    protected _name: string
    protected _root: Node
    protected _color: string

    constructor(name: string, color: string, root: Node) {
        this._name = name
        this._color = color
        this._root = root
    }

    public get name(): string {
        return this._name
    }

    public get color(): string {
        return this._color
    }

    public get root(): Node {
        return this._root
    }

    public set name(name: string) {
        this._name = name
    }

    equals(other: Universe): boolean {
        return this.name === other.name && this.root.equals(other.root)
    }
}
