import { Bytes } from '../SharedTypes/Size'
import { Node } from './Node'

export enum InitKind {
    NO_CLASS_CONSTRUCTOR = 0,
    RUN_TIME = 1,
    BUILD_TIME = 2,
    RERUN = 3
}

export class Leaf extends Node {
    protected _isReflective: boolean
    protected _isJni: boolean
    protected _isSynthetic: boolean
    protected _initKinds: InitKind[]

    constructor(
        name: string,
        codeSize: Bytes,
        initKinds: InitKind[],
        isReflective = false,
        isJni = false,
        isSynthetic = false,
        parent: Node | undefined = undefined
    ) {
        super(name, [], parent)
        this._codeSize = codeSize
        this._isReflective = isReflective
        this._isJni = isJni
        this._isSynthetic = isSynthetic
        this._initKinds = initKinds
    }

    get isInline(): boolean {
        return this.codeSize <= 0
    }

    get isReflective(): boolean {
        return this._isReflective
    }

    get isJni(): boolean {
        return this._isJni
    }

    get isSynthetic(): boolean {
        return this._isSynthetic
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
            this.isSynthetic
        )
    }
}
