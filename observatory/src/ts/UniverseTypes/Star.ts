import { SEPARATOR } from '../globals'
import { Universe } from './Universe'

export enum InitKind {
    RUN_TIME = 1,
    BUILD_TIME = 2,
    RERUN = 3
}

// Reason for exclude: Knowing whether a method is reflective, JNI,
// or synthetic is encoded as individual bits which we need & for
/* eslint-disable no-bitwise */
export class Star implements Universe {
    private _name = ''
    private _parent: Universe | undefined
    private _codeSize = 0
    private _detailFlag = 0
    private _initKind: InitKind

    constructor(
        name: string,
        parent: Universe | undefined,
        codeSize: number,
        detailFlag: number,
        initKind: InitKind
    ) {
        this._name = name
        this._parent = parent
        this._codeSize = codeSize
        this._detailFlag = detailFlag
        this._initKind = initKind
    }

    get parent(): Universe | undefined {
        return this._parent
    }

    public get name(): string {
        return this._name
    }

    public get codeSize(): number {
        return this._codeSize
    }

    public get detailFlag(): number {
        return this._detailFlag
    }

    public get initKind(): InitKind {
        return this.initKind
    }

    public get universes(): Universe[] {
        return []
    }

    public equals(another: Star) {
        return (
            this.name === another.name &&
            this.codeSize === another.codeSize &&
            this.detailFlag === another.detailFlag &&
            this.parent === another.parent &&
            this.initKind === another.initKind
        )
    }

    public identifier(): string {
        let path = this.name
        let root: Universe | undefined = this.parent
        while (root != undefined) {
            path = root.name + SEPARATOR + path
            root = root.parent
        }
        return path
    }

    public isInline(): boolean {
        return this.codeSize <= 0
    }

    public isReflective(): boolean {
        return (this.detailFlag & (1 << 0)) != 0
    }

    public isJNI(): boolean {
        return (this.detailFlag & (1 << 1)) != 0
    }

    public isSynthetic(): boolean {
        return (this.detailFlag & (1 << 2)) != 0
    }
}
