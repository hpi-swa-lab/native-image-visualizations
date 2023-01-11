import {
    CustomEventDetails,
    CustomEventName,
    Dictionary,
    MyNode,
    NodesSortingFilter,
    SortingOption,
    SortingOrder,
    SvgSelections,
    Tree,
    TreeNodesFilter,
    UniverseProps
} from './TreeTypes'
import { ROOT_NODE_NAME } from './TreeConstants'
import { HierarchyPointNode, Transition } from 'd3'
import * as d3 from 'd3'

// ##########################################################################################################
// ##### (PRE-)PROCESSING UTILS #############################################################################
// ##########################################################################################################

export function setAttributes(el: HTMLElement, attrs: { [key: string]: string }) {
    for (const key in attrs) {
        el.setAttribute(key, attrs[key])
    }
}

export function createApplyFilterEvent(filter: TreeNodesFilter) {
    return createCustomEventWithDetails(CustomEventName.APPLY_FILTER, filter)
}

export function createExpandTreeEvent(filter: TreeNodesFilter) {
    return createCustomEventWithDetails(CustomEventName.EXPAND_TREE, filter)
}

export function createCustomEventWithDetails(name: string, filter: TreeNodesFilter) {
    return new CustomEvent<CustomEventDetails>(name, {
        detail: {
            name: name,
            filter: filter
        }
    })
}

export function createHierarchyFromPackages(
    universeId: number,
    text: string,
    dataTree: MyNode,
    leaves: Set<MyNode>,
    sets: Set<string>
) {
    for (const row of text.split('\n')) {
        if (row == '' || row.includes('$$')) continue
        let current = dataTree
        // let pathSegments = row.split(/[.$]/)
        let pathSegments = row.split('.')
        pathSegments.pop() // remove methods
        pathSegments.pop() // remove classes
        for (let i = 0; i < pathSegments.length; i++) {
            let child = current.children.find((child) => child.name === pathSegments[i])
            if (child) {
                child.universes.add(universeId)
            } else {
                child = {
                    name: pathSegments[i],
                    children: [],
                    parent: current,
                    universes: new Set<number>().add(universeId),
                    isModified: false,
                    isFiltered: false,
                    codeSize: 0
                }
                current.children.push(child)
            }
            sets.add(Array.from(child.universes).join(''))
            current = child
            if (i === pathSegments.length - 1) leaves.add(child)
        }
    }
}

export function markNodesModifiedFromLeaves(leaves: MyNode[]) {
    for (const leave of leaves) {
        if (leave.universes.size !== 1) continue
        markModified(leave)
    }
}

function markModified(node: MyNode) {
    if (node.isModified) return
    node.isModified = true
    if (node.parent !== undefined) markModified(node.parent)
}

export function diffNodesFromLeaves(leaves: MyNode[], filter: TreeNodesFilter) {
    for (const leave of leaves) {
        if (leave.universes.size < 1) continue
        if (filter.diffing.showUnmodified) {
            if (
                !leave.isModified ||
                Array.from(leave.universes).every((u) => filter.diffing.universes.has(u.toString()))
            ) {
                markFiltered(leave)
            }
        } else if (
            leave.isModified &&
            Array.from(leave.universes).every((u) => filter.diffing.universes.has(u.toString()))
        ) {
            markFiltered(leave)
        }
    }
}

function markFiltered(node: MyNode) {
    if (node.isFiltered) return
    node.isFiltered = true
    if (node.parent !== undefined) markFiltered(node.parent)
}

export function removeDiffingFilterFromTree(node: MyNode) {
    node.isFiltered = false
    node.children.forEach(removeDiffingFilterFromTree)
}

export function collapseChildren(d: any) {
    if (!d.children) return

    d.children.forEach((child: any) => collapseChildren(child))
    d.children = null
}

export function setNodeSizeFromLeaves(leaves: MyNode[]) {
    const parents = new Set<MyNode>()
    for (let leave of leaves) {
        leave.codeSize = 1
        parents.add(leave.parent)
    }
    setSize(Array.from(parents))
}

function setSize(nodes: MyNode[]) {
    const parents = new Set<MyNode>()
    for (let node of nodes) {
        node.codeSize = node.children
            .map((child) => child.codeSize)
            .reduce((sum: number, codeSize: number) => sum + codeSize)
        if (node.parent) parents.add(node.parent)
    }

    if (nodes.length == 1 && nodes[0].name == ROOT_NODE_NAME) return

    setSize(Array.from(parents))
}

export function countPrivateLeaves(node: any): number {
    if (!node._children) {
        return 1
    }
    return node._children.reduce((sum: number, child: any) => sum + countPrivateLeaves(child), 0)
}

// ##########################################################################################################
// ##### EVENT UTILS ########################################################################################
// ##########################################################################################################

// see source code: https://d3-graph-gallery.com/graph/interactivity_tooltip.html
// Three function that change the tooltip when user hover / move / leave a cell
export function mouseover(
    event: MouseEvent,
    d: HierarchyPointNode<MyNode>,
    svgSelections: SvgSelections
) {
    svgSelections.tooltip.style('opacity', 1)
}
export function mousemove(
    event: MouseEvent,
    d: HierarchyPointNode<MyNode>,
    svgSelections: SvgSelections,
    universePropsDict: Dictionary<UniverseProps>
) {
    const universesText = universePropsDict[Array.from(d.data.universes).join('')]
        ? universePropsDict[Array.from(d.data.universes).join('')].name
        : 'N/A'
    svgSelections.tooltip
        .html(
            `**Node data:**
                            <br>codeSize: ${d.data.codeSize}
                            <br>isFiltered: ${d.data.isFiltered}
                            <br>isModified: ${d.data.isModified}
                            <br>universes: ${universesText}
                            <br>has children: ${d.children?.length || undefined}
                            <br>has _children: ${(d as any)._children?.length || undefined}
                            `
        )
        .style('left', event.x + 20 + 'px')
        .style('top', event.y + 'px')
}
export function mouseout(
    event: MouseEvent,
    d: HierarchyPointNode<MyNode>,
    svgSelections: SvgSelections
) {
    svgSelections.tooltip.style('opacity', 0)
}

// Toggle children.
export function toggle(d: any, doToggleBranch: boolean) {
    if (!d._children) return

    d.children
        ? collapseChildren(d)
        : (d.children = d._children.filter((child: any) => child.data.isFiltered))

    if (doToggleBranch) {
        for (const child of d.children) {
            toggle(child, doToggleBranch)
        }
    }
}

export function handleCustomTreeEvent(event: any, tree: Tree) {
    if (event.detail.name === CustomEventName.APPLY_FILTER) {
        console.log(event.detail.name, true)
        tree.root.eachBefore((node: any) => {
            if (!node._children) return
            sortChildren(node, event.detail.filter.sorting)
            if (node.children) node.children = filterDiffingUniverses(node)
        })
    }

    // expand full tree
    if (event.detail.name === CustomEventName.EXPAND_TREE) {
        console.log(event.detail.name, true)
        tree.root.eachBefore((node: any) => {
            if (!node._children) return
            sortChildren(node, event.detail.filter.sorting)
            node.children = filterDiffingUniverses(node)
        })
    }
}

function filterDiffingUniverses(node: any) {
    if (!node._children) return
    return node._children.filter((child: any) => child.data.isFiltered)
}

function sortChildren(node: any, filter: NodesSortingFilter) {
    return node._children.sort((a: any, b: any) => {
        const valueA = getSortingValue(a, filter)
        const valueB = getSortingValue(b, filter)
        if (filter.option !== SortingOption.NAME && valueA === valueB) {
            // sort alphabetically ascending
            // FIXME it's magically alphabetically reversed sometimes ò.ó
            return a.name > b.name
        }
        return filter.order == SortingOrder.ASCENDING ? valueA > valueB : valueA < valueB
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

// ##########################################################################################################
// ##### VISUALIZATION UTILS ################################################################################
// ##########################################################################################################

export function enterNode(node: any, sourceNode: any, onClickCallback: Function) {
    // Enter any new nodes at the parent's previous position.
    return node
        .enter()
        .append('g')
        .attr('transform', () => `translate(${sourceNode.y0 ?? 0},${sourceNode.x0 ?? 0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (evt: MouseEvent, d: any) => {
            onClickCallback(evt, d)
        })
}

export function appendTextToNode(
    node: any,
    startPositionOffset: number,
    endPositionOffset: number
) {
    return node
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d._children ? startPositionOffset : endPositionOffset))
        .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
        .text((d: any) => d.data.name)
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white')
}

export function updateNode(
    node: any,
    nodeEnter: any,
    transition: Transition<SVGGElement, unknown, HTMLElement, any>
) {
    // Transition nodes to their new position.
    return node
        .merge(nodeEnter)
        .transition(transition)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1)
}

export function exitNode(
    node: any,
    sourceNode: any /*HierarchyPointNode<MyNode>*/,
    transition: Transition<SVGGElement, unknown, HTMLElement, any>
) {
    // Transition exiting nodes to the parent's new position.
    return node
        .exit()
        .transition(transition)
        .remove()
        .attr('transform', () => `translate(${sourceNode.y},${sourceNode.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
}

export function exitLink(
    link: any,
    linkGenerator: d3.Link<any, any, any>,
    sourceNode: any /*HierarchyPointNode<MyNode>*/,
    transition: Transition<SVGGElement, unknown, HTMLElement, any>
) {
    // Transition exiting nodes to the parent's new position.
    return link
        .exit()
        .transition(transition)
        .remove()
        .attr('d', (d: any) => {
            const o = { x: sourceNode.x, y: sourceNode.y }
            return linkGenerator({ source: o, target: o })
        })
}
