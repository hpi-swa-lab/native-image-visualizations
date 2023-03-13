import {
    CustomEventDetails,
    CustomEventName, SankeyHierarchyPointNode,
    UniverseMetadata
} from '../../SharedTypes/SankeyTree'
import { NodesFilter, NodesSortingFilter } from '../../SharedTypes/NodesFilter'
import { SortingOption, SortingOrder } from '../../enums/Sorting'
import { Node } from '../../UniverseTypes/Node'
import { formatBytes } from '../../SharedTypes/Size'

// #################################################################################################
// ##### (PRE-)PROCESSING UTILS ####################################################################
// #################################################################################################
export function createApplyFilterEvent(filter: NodesFilter) {
    return createCustomEventWithDetails(CustomEventName.APPLY_FILTER, filter)
}

export function createCustomEventWithDetails(name: string, filter: NodesFilter) {
    return new CustomEvent<CustomEventDetails>(name, {
        detail: {
            name: name,
            filter: filter
        }
    })
}

export function getCodeSizefromLeaves(node: SankeyHierarchyPointNode): number {
    if (!node._children) {
        return node.data.codeSize
    }
    return node._children.reduce((sum: number, child: SankeyHierarchyPointNode) =>
        sum + getCodeSizefromLeaves(child), 0)
}

// #################################################################################################
// ##### EVENT UTILS ###############################################################################
// #################################################################################################

export function toggleChildren(
    d: SankeyHierarchyPointNode,
    doToggleBranch: boolean,
    filteredNodes: Node[]
) {
    if (!d._children) return

    d.children
        ? collapseChildren(d)
        : (d.children = d._children.filter((child: SankeyHierarchyPointNode) =>
            filteredNodes.includes(d.data)))

    if (doToggleBranch) {
        for (const child of d.children) {
            toggleChildren(child, doToggleBranch, filteredNodes)
        }
    }
}

export function collapseChildren(d: SankeyHierarchyPointNode) {
    if (!d.children) return

    d.children.forEach((child: SankeyHierarchyPointNode) => collapseChildren(child))
    d.children = undefined
}

export function countCurrentPrivateLeaves(node: SankeyHierarchyPointNode): number {
    if (!node._children) {
        return 1
    }
    return node._children.reduce(
        (sum: number, child: SankeyHierarchyPointNode) => sum + countCurrentPrivateLeaves(child),
        0
    )
}

export function filterDiffingUniverses(node: SankeyHierarchyPointNode, filteredNodes: Node[]) {
    if (!node._children) return
    return node._children.filter((child: SankeyHierarchyPointNode) =>
        filteredNodes.includes(child.data))
}

export function sortPrivateChildren(node: SankeyHierarchyPointNode, filter: NodesSortingFilter) {
    // problem "'boolean' is not assignable to 'number'" is caused with the fix for Chrome
    // @ts-ignore
    return node._children?.sort((a: SankeyHierarchyPointNode, b: SankeyHierarchyPointNode) => {
        const valueA = getSortingValue(a, filter)
        const valueB = getSortingValue(b, filter)
        if (filter.option !== SortingOption.NAME && valueA === valueB) {
            // sort alphabetically ascending
            return a.data.name > b.data.name
        }
        // () ? 1 : -1 is a fixes sorting when using Chrome
        return (filter.order == SortingOrder.ASCENDING ? valueA > valueB : valueA < valueB) ? 1 : -1
    })
}

function getSortingValue(node: SankeyHierarchyPointNode, filter: NodesSortingFilter) {
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

export function asHTML(d: SankeyHierarchyPointNode, metadata: UniverseMetadata) {
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
