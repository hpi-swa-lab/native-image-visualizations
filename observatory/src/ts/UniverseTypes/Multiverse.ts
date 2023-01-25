import { Universe } from './Universe'
import { HIERARCHY_NAME_SEPARATOR } from '../globals'

export class Multiverse implements Universe {
    private _name = ''
    private _parent: Universe | undefined
    private _universes: Universe[] = []

    constructor(name: string, parent: Universe | undefined, universes: Universe[]) {
        this._name = name
        this._parent = parent
        this._universes = universes
    }

    public get parent() {
        return this._parent
    }

    public get name(): string {
        return this._name
    }

    public get codeSize(): number {
        return this._universes.reduce((partialSize, universe) => partialSize + universe.codeSize, 0)
    }

    public get universes(): Universe[] {
        return this._universes
    }

    public append(universe: Universe): number {
        return this._universes.push(universe)
    }

    public equals(another: Multiverse) {
        return (
            this.name === another.name &&
            this.parent === another.parent &&
            this.universes === another.universes
        )
    }

    public identifier(): string {
        let path = this.name
        let root: Universe | undefined = this.parent
        while (root != undefined) {
            path = root.name + HIERARCHY_NAME_SEPARATOR + path
            root = root.parent
        }
        return path
    }

    public isInline(): boolean {
        return this._universes.every((universe) => universe.isInline())
    }
}
