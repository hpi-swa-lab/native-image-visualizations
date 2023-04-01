import {
    FilterEventDetails,
    SankeyHierarchyPointNode,
    UniverseMetadata
} from '../../SharedTypes/SankeyTree'
import { NodesFilter, NodesSortingFilter } from '../../SharedTypes/NodesFilter'
import { SortingOption, SortingOrder } from '../../enums/Sorting'
import { Node } from '../../UniverseTypes/Node'
import { Bytes, formatBytes } from '../../SharedTypes/Size'
import { EventType } from '../../enums/EventType'
import { HIERARCHY_NAME_SEPARATOR, SUB_HIERARCHY_NAME_SEPARATOR } from '../../globals'
import { ROOT_NODE_NAME } from '../SankeyTree'
import { ExclusiveSizes } from '../../Math/Universes'
import { UniverseCombination } from '../../UniverseTypes/UniverseCombination'
import {Layers} from '../../enums/Layers';

// #################################################################################################
// ##### (PRE-)PROCESSING ##########################################################################
// #################################################################################################

export function createHierarchyFromPackages(
    node: Node,
    dataTree: Node,
    leaves: Set<Node>,
    exclusiveCodeSizes: Map<string, ExclusiveSizes>
) {
    let current = dataTree
    const pathSegments = node.identifier.substring(1).split(HIERARCHY_NAME_SEPARATOR)
    for (let i = 0; i < pathSegments.length; i++) {
        let hierarchySeparator = HIERARCHY_NAME_SEPARATOR
        let subPathSegments: string[] = []
        switch(i+1) {
            case Layers.METHODS:
                subPathSegments = [pathSegments[i]]
                break
            case Layers.MODULES:
                if (/.+[0-9]+.+\.jar$/.test(pathSegments[i])) {
                    subPathSegments = [pathSegments[i]]
                    break
                }
            default:
                subPathSegments = pathSegments[i].split(SUB_HIERARCHY_NAME_SEPARATOR)
        }

        for (let j = 0; j < subPathSegments.length; j++) {
            let child = current.children.find((child) => child.name === subPathSegments[j])
            if (child) {
                const codeSizeByUniverse = exclusiveCodeSizes.get(child.identifier) ?? new Map()
                for (const [universeId, sourceNode] of node.sources.entries()) {
                    codeSizeByUniverse.set(
                        universeId.toString(),
                        (codeSizeByUniverse.get(universeId.toString()) ?? 0) + sourceNode.codeSize
                    )
                }
                exclusiveCodeSizes.set(child.identifier, codeSizeByUniverse)
                child.codeSize = getMaxCodeSizeByUniverse(codeSizeByUniverse)
            } else {
                child = new Node(subPathSegments[j], [], current)
                child.sources = node.sources
                child.overrideHierarchyNameSeparator(hierarchySeparator)

                const codeSizeByUniverse = exclusiveCodeSizes.get(child.identifier) ?? new Map()
                for (const [universeId, sourceNode] of node.sources.entries()) {
                    codeSizeByUniverse.set(universeId.toString(), sourceNode.codeSize)
                }
                exclusiveCodeSizes.set(child.identifier, codeSizeByUniverse)
                child.codeSize = getMaxCodeSizeByUniverse(codeSizeByUniverse)

                current.children.push(child)
            }

            current = child
            hierarchySeparator = SUB_HIERARCHY_NAME_SEPARATOR

            if (i === pathSegments.length - 1 && j === subPathSegments.length - 1) leaves.add(child)
        }
    }
}

function getMaxCodeSizeByUniverse(codeSizeByUniverse: Map<UniverseCombination, Bytes>) {
    return Array.from(codeSizeByUniverse.values()).reduce(
        (max, codeSize) => Math.max(max, codeSize),
        Number.MIN_VALUE
    )
}

export function newApplyFilterEvent(filter: NodesFilter) {
    return new CustomEvent<FilterEventDetails>(EventType.APPLY_FILTER, {
        detail: {
            name: EventType.APPLY_FILTER,
            filter: filter
        }
    })
}

// #################################################################################################
// ##### EVENTS ####################################################################################
// #################################################################################################

export function toggleSelection(node: Node, selection: Set<string>): void {
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
    const filteredChildren = vizNode._children.filter((child: SankeyHierarchyPointNode) =>
        filteredNodes.includes(child.data)
    )
    return filteredChildren.length === 0 ? undefined : filteredChildren
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

export function asHTML(
    vizNode: SankeyHierarchyPointNode,
    exclusiveCodeSizes: Map<string, ExclusiveSizes>,
    metadata: UniverseMetadata
) {
    if (Object.keys(metadata).length == 1) {
    }
    const node: Node = vizNode.data
    return `<b>Exists in</b>: ${Array.from(node.sources.keys())
        .map((uniIndex) => metadata[uniIndex].name)
        .join(' ∩ ')}
                <b>Path</b>: ${getWithoutRoot(node.identifier)}
                ${printCodeSizePerUniverse(vizNode, exclusiveCodeSizes, metadata)}`
}

function printCodeSizePerUniverse(
    vizNode: SankeyHierarchyPointNode,
    exclusiveCodeSizes: Map<string, ExclusiveSizes>,
    metadata: UniverseMetadata
) {
    if (!exclusiveCodeSizes || !exclusiveCodeSizes.get(vizNode.data.identifier)) return ''
    let html = ''
    const printName = Object.keys(metadata).length > 1

    // Reason: This is likely to be a false alarm by eslint
    // because an early return is already made if undefined.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    exclusiveCodeSizes
        .get(vizNode.data.identifier)!
        .forEach(
            (codeSize, uniID) =>
                (html += `<b>Code Size${
                    printName ? ` in ${metadata[parseInt(uniID)].name}` : ''
                }</b>: ${formatBytes(codeSize)}\n`)
        )
    html = html.slice(0, -1)
    return html
}

export function getWithoutRoot(identifier: string) {
    return identifier.substring(ROOT_NODE_NAME.length, identifier.length)
}
