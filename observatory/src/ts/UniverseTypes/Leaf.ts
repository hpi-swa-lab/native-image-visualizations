import { Bytes } from '../SharedTypes/Size'
import { InitKind } from '../enums/InitKind'
import { Node } from './Node'

export class Leaf extends Node {
    protected _initKinds: InitKind[]

    constructor(
        name: string,
        codeSize: Bytes,
        initKinds: InitKind[],
        isReflective = false,
        isJni = false,
        isSynthetic = false,
        parent: Node | undefined = undefined,
        isSystem = false
    ) {
        super(name, [], parent, codeSize, isReflective, isJni, isSynthetic, isSystem)
        this._initKinds = initKinds
    }

    get initKinds(): InitKind[] {
        return this._initKinds
    }

    public equals(another: Leaf): boolean {
        return (
            super.equals(another) &&
            this.isReflective === another.isReflective &&
            this.isJni === another.isJni &&
            this.isSynthetic === another.isSynthetic &&
            this.initKinds.length === another.initKinds.length &&
            this.initKinds.sort().toString() === another.initKinds.sort().toString()
        )
    }

    public clonePrimitive(): Leaf {
        return new Leaf(
            this.name,
            this.codeSize,
            [...this.initKinds],
            this.isReflective,
            this.isJni,
            this.isSynthetic,
            undefined,
            this._isSystem
        )
    }
}
