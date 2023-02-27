export enum InitKind {
    NO_CLASS_CONSTRUCTOR = 0,
    RUN_TIME = 1,
    BUILD_TIME = 2,
    RERUN = 3
}

export function initKindForExport(initKind: InitKind): string {
    return initKind.toString()
}
