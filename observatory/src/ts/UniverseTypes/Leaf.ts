import { Bytes } from '../SharedTypes/Size'
import { Node } from './Node'

export enum InitKind {
    RUN_TIME = 1,
    BUILD_TIME = 2,
    RERUN = 3
}

export class Leaf extends Node {
    protected _isReflective: boolean
    protected _isJni: boolean
    protected _isSynthetic: boolean
    protected _initKind: InitKind

    constructor(
        name: string,
        codeSize: Bytes,
        initKind: InitKind,
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
        this._initKind = initKind
    }

    get inline(): boolean {
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

    get initKind(): InitKind {
        return this._initKind
    }

    public equals(another: Leaf): boolean {
        return (
            super.equals(another) &&
            this.isReflective === another.isReflective &&
            this.isJni === another.isJni &&
            this.isSynthetic === another.isSynthetic &&
            this.initKind === another.initKind
        )
    }
}
