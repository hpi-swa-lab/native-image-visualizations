export type NodesFilter = {
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
