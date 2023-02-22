import { SortingOption, SortingOrder } from '../enums/Sorting'

export type NodesFilter = {
    diffing: NodesDiffingFilter
    sorting: NodesSortingFilter
}

export type NodesDiffingFilter = {
    universes: Set<string>
    showUnmodified: boolean
}

export type NodesSortingFilter = {
    option: SortingOption
    order: SortingOrder
}
