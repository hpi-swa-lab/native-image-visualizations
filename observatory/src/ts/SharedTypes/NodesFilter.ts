import { SortingOption, SortingOrder } from '../enums/Sorting'

export type NodesFilter = {
    diffing: NodesDiffingFilter
    sorting: NodesSortingFilter
}

export type NodesDiffingFilter = {
    universes: Set<number>
    showUnmodified: boolean
}

export type NodesSortingFilter = {
    option: SortingOption
    order: SortingOrder
}
