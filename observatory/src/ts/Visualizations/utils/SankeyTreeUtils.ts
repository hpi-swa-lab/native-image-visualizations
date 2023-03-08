import {
    ContainerSelections,
    CustomEventDetails,
    CustomEventName,
    Tree,
    UniverseMetadata
} from '../../SharedTypes/SankeyTree'
import { NodesFilter, NodesSortingFilter } from '../../SharedTypes/NodesFilter'
import { SortingOption, SortingOrder } from '../../enums/Sorting'
import { Node } from '../../UniverseTypes/Node'
import { HierarchyPointNode } from 'd3'
import { formatBytes } from '../../SharedTypes/Size'

// #################################################################################################
// ##### (PRE-)PROCESSING UTILS ####################################################################
// #################################################################################################
export function createApplyFilterEvent(filter: NodesFilter) {
    return createCustomEventWithDetails(CustomEventName.APPLY_FILTER, filter)
}
//
// export function createExpandTreeEvent(filter: NodesFilter) {
//     return createCustomEventWithDetails(CustomEventName.EXPAND_TREE, filter)
// }
//
export function createCustomEventWithDetails(name: string, filter: NodesFilter) {
    return new CustomEvent<CustomEventDetails>(name, {
        detail: {
            name: name,
            filter: filter
        }
    })
}

export function getCodeSizefromLeaves(node: any): number {
    if (!node._children) {
        return node.data.codeSize
    }
    return node._children.reduce((sum: number, child: any) => sum + getCodeSizefromLeaves(child), 0)
}

// #################################################################################################
// ##### EVENT UTILS ###############################################################################
// #################################################################################################

export function toggleChildren(d: any, doToggleBranch: boolean, filteredNodes: Node[]) {
    if (!d._children) return

    d.children
        ? collapseChildren(d)
        : (d.children = d._children.filter((child: any) => filteredNodes.includes(d.data)))

    if (doToggleBranch) {
        for (const child of d.children) {
            toggleChildren(child, doToggleBranch, filteredNodes)
        }
    }
}

export function collapseChildren(d: any) {
    if (!d.children) return

    d.children.forEach((child: any) => collapseChildren(child))
    d.children = null
}

export function countCurrentPrivateLeaves(node: any): number {
    if (!node._children) {
        return 1
    }
    return node._children.reduce(
        (sum: number, child: any) => sum + countCurrentPrivateLeaves(child),
        0
    )
}

export function filterDiffingUniverses(node: any, filteredNodes: Node[]) {
    if (!node._children) return
    return node._children.filter((child: any) => filteredNodes.includes(child.data))
}

export function sortPrivateChildren(node: any, filter: NodesSortingFilter) {
    return node._children.sort((a: any, b: any) => {
        const valueA = getSortingValue(a, filter)
        const valueB = getSortingValue(b, filter)
        if (filter.option !== SortingOption.NAME && valueA === valueB) {
            // sort alphabetically ascending
            // FIXME it's magically alphabetically reversed sometimes ò.ó
            return a.name > b.name
        }
        // () ? 1 : -1 is a fixes sorting when using Chrome
        return (filter.order == SortingOrder.ASCENDING ? valueA > valueB : valueA < valueB) ? 1 : -1
    })
}

function getSortingValue(node: any, filter: NodesSortingFilter) {
    switch (filter.option) {
        case SortingOption.NAME:
            return node.data.name
        case SortingOption.SIZE:
            return node.data.codeSize
    }
}

// #################################################################################################
// ##### HELPER UTILS ##############################################################################
// #################################################################################################

export function asHTML(d: HierarchyPointNode<Node>, metadata: UniverseMetadata) {
    const node: Node = d.data
    return `<b>Exists in</b>: ${Array.from(node.sources.keys())
        .map((uniIndex) => metadata[uniIndex].name)
        .join(', ')}
                <b>Name</b>: ${node.identifier}
                <b>Code Size</b>: ${formatBytes(node.codeSize)}`
}

export function getWithoutRoot(identifier: string) {
    return identifier.substring(4, identifier.length)
}
