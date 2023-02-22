import { Node } from './Node'

export class Universe {
    protected _name: string
    protected _root: Node

    constructor(name: string, root: Node) {
        this._name = name
        this._root = root
    }

    public get name(): string {
        return this._name
    }

    public set name(name: string) {
        this._name = name
    }

    public get root(): Node {
        return this._root
    }

    equals(other: Universe): boolean {
        return this.name === other.name && this.root.equals(other.root)
    }
}
