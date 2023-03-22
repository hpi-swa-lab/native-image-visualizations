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
import {HIERARCHY_NAME_SEPARATOR, SUB_HIERARCHY_NAME_SEPARATOR} from '../../globals'
import { ROOT_NODE_NAME } from '../SankeyTree'

// #################################################################################################
// ##### (PRE-)PROCESSING ##########################################################################
// #################################################################################################

export function createHierarchyFromPackages(node: Node, dataTree: Node, leaves: Set<Node>) {
    let current = dataTree
    const pathSegments = node.identifier.substring(1)
        .split(HIERARCHY_NAME_SEPARATOR)
        .join(SUB_HIERARCHY_NAME_SEPARATOR)
        .split(SUB_HIERARCHY_NAME_SEPARATOR)
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

export function getCodeSizeFromLeaves(vizNode: SankeyHierarchyPointNode): number {
    if (!vizNode._children) {
        return vizNode.data.codeSize
    }
    return vizNode._children.reduce(
        (sum: number, child: SankeyHierarchyPointNode) => sum + getCodeSizeFromLeaves(child),
        0
    )
}

// #################################################################################################
// ##### EVENTS ####################################################################################
// #################################################################################################

export function toggleSelection(node: Node, selection: Set<string>): void {
    // Fixme node.identifier needs correct hierarchy_separators!!
    const identifier = getWithoutRoot(node.identifier)
    if (selection.has(identifier)) {
        selection.delete(identifier)
    } else {
        selection.add(identifier)
    }
}

export function toggleChildren(
    vizNode: SankeyHierarchyPointNode,
    doToggleBranch: boolean,
    filteredNodes: Node[]
) {
    if (!vizNode._children) return

    vizNode.children
        ? collapseChildren(vizNode)
        : (vizNode.children = vizNode._children.filter((child: SankeyHierarchyPointNode) =>
              filteredNodes.includes(child.data)
          ))

    if (vizNode.children && doToggleBranch) {
        vizNode.children.forEach((child) => toggleChildren(child, doToggleBranch, filteredNodes))
    }
}

export function collapseChildren(vizNode: SankeyHierarchyPointNode) {
    if (!vizNode.children) return

    vizNode.children.forEach((child: SankeyHierarchyPointNode) => collapseChildren(child))
    vizNode.children = undefined
}

// #################################################################################################
// ##### FILTERING #################################################################################
// #################################################################################################

export function filterDiffingUniverses(vizNode: SankeyHierarchyPointNode, filteredNodes: Node[]) {
    if (!vizNode._children) return
    return vizNode._children.filter((child: SankeyHierarchyPointNode) =>
        filteredNodes.includes(child.data)
    )
}

export function sortPrivateChildren(vizNode: SankeyHierarchyPointNode, filter: NodesSortingFilter) {
    // Reason: the problem "'boolean' is not assignable to 'number'" is caused by
    // the fix for Chrome
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return vizNode._children?.sort((a: SankeyHierarchyPointNode, b: SankeyHierarchyPointNode) => {
        const valueA = getSortingValue(a, filter)
        const valueB = getSortingValue(b, filter)
        if (filter.option !== SortingOption.NAME && valueA === valueB) {
            return a.data.name > b.data.name
        }
        // () ? 1 : -1 is a fixes sorting when using Chrome
        return (filter.order == SortingOrder.ASCENDING ? valueA > valueB : valueA < valueB) ? 1 : -1
    })
}

function getSortingValue(vizNode: SankeyHierarchyPointNode, filter: NodesSortingFilter) {
    switch (filter.option) {
        case SortingOption.NAME:
            return vizNode.data.name
        case SortingOption.SIZE:
            return vizNode.data.codeSize
        default:
            return vizNode.data.name
    }
}

// #################################################################################################
// ##### OTHER #####################################################################################
// #################################################################################################

export function asHTML(vizNode: SankeyHierarchyPointNode, metadata: UniverseMetadata) {
    const node: Node = vizNode.data
    return `<b>Exists in</b>: ${Array.from(node.sources.keys())
        .map((uniIndex) => metadata[uniIndex].name)
        .join(', ')}
                <b>Name</b>: ${node.identifier}
                <b>Code Size</b>: ${formatBytes(node.codeSize)}`
}

export function getWithoutRoot(identifier: string) {
    return identifier.substring(ROOT_NODE_NAME.length, identifier.length)
}
