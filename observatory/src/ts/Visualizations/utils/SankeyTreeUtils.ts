import {
    FilterEventDetails,
    SankeyHierarchyPointNode,
    UniverseMetadata
} from '../../SharedTypes/SankeyTree'
import { NodesFilter, NodesSortingFilter } from '../../SharedTypes/NodesFilter'
import { SortingOption, SortingOrder } from '../../enums/Sorting'
import { Node } from '../../UniverseTypes/Node'
import { formatBytes } from '../../SharedTypes/Size'
import { EventType } from '../../enums/EventType'

// #################################################################################################
// ##### (PRE-)PROCESSING ##########################################################################
// #################################################################################################

export function createHierarchyFromPackages(node: Node, dataTree: Node, leaves: Set<Node>) {
    let current = dataTree
    const pathSegments = node.identifier.substring(1).split('.')
    for (let i = 0; i < pathSegments.length; i++) {
        let child = current.children.find((child) => child.name === pathSegments[i])
        if (child) {
            child.sources.set(node.sources.keys().next().value, node.sources.values().next().value)
            child.codeSize = child.codeSize + node.codeSize

            // FIXME set correct codeSize in child
            //  (right now its the sum of A+B in the merged node)
            //  #153 https://github.com/hpi-swa-lab/MPWS2022RH1/issues/153
        } else {
            child = new Node(pathSegments[i], [], current, node.codeSize)
            child.sources = node.sources
            current.children.push(child)
        }

        current = child
        if (i === pathSegments.length - 1) leaves.add(child)
    }
}

export function newApplyFilterEvent(filter: NodesFilter) {
    return new CustomEvent<FilterEventDetails>(EventType.APPLY_FILTER, {
        detail: {
            name: EventType.APPLY_FILTER,
            filter: filter
        }
    })
}

export function getCodeSizeFromLeaves(node: SankeyHierarchyPointNode): number {
    if (!node._children) {
        return node.data.codeSize
    }
    return node._children.reduce(
        (sum: number, child: SankeyHierarchyPointNode) => sum + getCodeSizeFromLeaves(child),
        0
    )
}

// #################################################################################################
// ##### EVENTS ####################################################################################
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
              filteredNodes.includes(child.data)
          ))

    if (d.children && doToggleBranch) {
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

// #################################################################################################
// ##### FILTERING #################################################################################
// #################################################################################################

export function filterDiffingUniverses(node: SankeyHierarchyPointNode, filteredNodes: Node[]) {
    if (!node._children) return
    return node._children.filter((child: SankeyHierarchyPointNode) =>
        filteredNodes.includes(child.data)
    )
}

export function sortPrivateChildren(node: SankeyHierarchyPointNode, filter: NodesSortingFilter) {
    // Reason: the problem "'boolean' is not assignable to 'number'" is caused by
    // the fix for Chrome
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
// ##### OTHER #####################################################################################
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
