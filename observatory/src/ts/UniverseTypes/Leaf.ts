import { Bytes } from '../SharedTypes/Size'
import { Node } from './Node'

export enum InitKind {
    RUN_TIME = 1,
    BUILD_TIME = 2,
    RERUN = 3
}

export class Leaf extends Node {
    protected _reflective: boolean
    protected _jni: boolean
    protected _synthetic: boolean
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
        this._reflective = reflective
        this._jni = jni
        this._synthetic = synthetic
        this._initKind = initKind
    }

    get reflective(): boolean {
        return this._reflective
    }

    get jni(): boolean {
        return this._jni
    }

    get synthetic(): boolean {
        return this._synthetic
    }

    get initKind(): InitKind {
        return this._initKind
    }

    public equals(another: Leaf): boolean {
        return (
            super.equals(another) &&
            this.synthetic === another.synthetic &&
            this.jni === another.jni &&
            this.reflective === another.reflective &&
            this.initKind === another.initKind
        )
    }
}
