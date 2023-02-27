import {
    SortingOption,
    sortingOptionForExport,
    SortingOrder,
    sortingOrderForExport
} from '../enums/Sorting'

export type NodesFilter = {
    diffing: NodesDiffingFilter
    sorting: NodesSortingFilter
}

export function nodesFilterForExport(
    filter: NodesFilter
): Record<string, string | string[] | boolean> {
    const diffingExport = nodesDiffingFilterForExport(filter.diffing)
    const sortingExport = nodesSortingFilterForExport(filter.sorting)

    return {
        diffingUniverses: diffingExport.universes,
        diffingSowUnmodified: diffingExport.showUnmodified,
        sortingOption: sortingExport.option,
        sortingOrder: sortingExport.order
    }
}

export type NodesDiffingFilter = {
    universes: Set<string>
    showUnmodified: boolean
}

export function nodesDiffingFilterForExport(
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

export function nodesSortingFilterForExport(filter: NodesSortingFilter): Record<string, string> {
    return {
        option: sortingOptionForExport(filter.option),
        order: sortingOrderForExport(filter.order)
    }
}
