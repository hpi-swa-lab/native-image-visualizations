export type TreeNodesFilter = {
    diffing: DiffingUniversesFilter
    sorting: NodesSortingFilter
}

export type DiffingUniversesFilter = {
    universes: Set<string>
    showUnmodified: boolean
}

export type NodesSortingFilter = {
    option: string
    order: string
}

export type NodeTextPositionOffset = {
    start: number
    end: number
}
