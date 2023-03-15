import {
    SortingOption,
    sortingOptionForExport,
    SortingOrder,
    sortingOrderForExport
} from '../enums/Sorting'
import {UniverseIndex} from './Indices';

export type NodesFilter = {
    diffing: NodesDiffingFilter
    sorting: NodesSortingFilter
}

export function serializeNodesFilter(
    filter: NodesFilter
): Record<string, string | UniverseIndex[] | boolean> {
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
    universes: Set<UniverseIndex>
    showUnmodified: boolean
}

export function serializeNodesDiffingFilter(
    filter: NodesDiffingFilter
): Record<string, UniverseIndex[] | boolean> {
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
        option: sortingOptionForExport(filter.option),
        order: sortingOrderForExport(filter.order)
    }
}
