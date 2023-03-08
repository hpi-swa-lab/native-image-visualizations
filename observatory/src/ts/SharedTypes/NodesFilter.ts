import {
    SortingOption,
    serializeSortingOption,
    SortingOrder,
    serializeSortingOrder
} from '../enums/Sorting'

export type NodesFilter = {
    diffing: NodesDiffingFilter
    sorting: NodesSortingFilter
}

export function serializeNodesFilter(
    filter: NodesFilter
): Record<string, string | string[] | boolean> {
    const diffingExport = serializeNodesDiffingFilter(filter.diffing)
    const sortingExport = serializeNodesSortingFilter(filter.sorting)

    return {
        diffingUniverses: diffingExport.universes,
        diffingShowUnmodified: diffingExport.showUnmodified,
        sortingOption: sortingExport.option,
        sortingOrder: sortingExport.order
    }
}

export type NodesDiffingFilter = {
    universes: Set<string>
    showUnmodified: boolean
}

export function serializeNodesDiffingFilter(
    filter: NodesDiffingFilter
): Record<string, string[] | boolean> {
    return {
        universes: Array.from(filter.universes),
        showUnmodified: filter.showUnmodified
    }
}

export type NodesSortingFilter = {
    option: SortingOption
    order: SortingOrder
}

export function serializeNodesSortingFilter(filter: NodesSortingFilter): Record<string, string> {
    return {
        option: serializeSortingOption(filter.option),
        order: serializeSortingOrder(filter.order)
    }
}
