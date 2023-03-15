import {
    SortingOption,
    serializeSortingOption,
    SortingOrder,
    serializeSortingOrder,
    deserializeSortingOrder,
    deserializeSortingOption
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

export function deserializeNodesFilter(config: Record<string, unknown>): NodesFilter | undefined {
    if (
        ['diffingUniverses', 'diffingShowUnmodified', 'sortingOption', 'sortingOrder'].some(
            (option) => !(option in config)
        )
    ) {
        return undefined
    }

    const diffing = deserializeNodesDiffingFilter({
        universes: config['diffingUniverses'],
        showUnmodified: config['diffingShowUnmodified']
    })

    if (!diffing) return undefined

    const sorting = deserializeNodesSortingFilter({
        order: config['order'],
        option: config['option']
    })

    if (!sorting) return undefined

    return {
        diffing: diffing,
        sorting: sorting
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

export function deserializeNodesDiffingFilter(
    config: Record<string, unknown>
): NodesDiffingFilter | undefined {
    if (
        !('universes' in config) ||
        !Array.isArray(config['universes']) ||
        config['universes'].some((value) => typeof value !== 'string') ||
        !('showUnmodified' in config) ||
        typeof config['showUnmodified'] !== 'boolean'
    ) {
        return undefined
    }

    return {
        universes: new Set(config['universes']),
        showUnmodified: config['showUnmodified']
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

export function deserializeNodesSortingFilter(
    config: Record<string, unknown>
): NodesSortingFilter | undefined {
    if (
        !('order' in config) ||
        typeof config['order'] !== 'string' ||
        !('option' in config) ||
        typeof config['option'] !== 'string'
    ) {
        return undefined
    }

    const order = deserializeSortingOrder(config['order'])
    const option = deserializeSortingOption(config['option'])

    if (order && option) {
        return {
            order: order,
            option: option
        }
    }

    return undefined
}
