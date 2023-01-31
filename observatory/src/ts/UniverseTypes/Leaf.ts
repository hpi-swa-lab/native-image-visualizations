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
        reflective = false,
        jni = false,
        synthetic = false,
        parent: Node | undefined = undefined
    ) {
        super(name, [], parent)
        this._codeSize = codeSize
        this._isReflective = reflective
        this._isJni = jni
        this._isSynthetic = synthetic
        this._initKind = initKind
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
            this.isSynthetic === another.isSynthetic &&
            this.isJni === another.isJni &&
            this.isReflective === another.isReflective &&
            this.initKind === another.initKind
        )
    }

    public is(another: Leaf): boolean {
        return (
            Object.is(this.name, another.name) &&
            Object.is(JSON.stringify(this.occurencesIn), JSON.stringify(another.occurencesIn)) &&
            Object.is(this.codeSize, another.codeSize) &&
            Object.is(this.isSynthetic, another.isSynthetic) &&
            Object.is(this.isJni, another.isJni) &&
            Object.is(this.isReflective, another.isReflective) &&
            Object.is(this.initKind, another.initKind)
        )
    }
}
