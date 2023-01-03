import { HierarchyPointNode } from 'd3'
import * as d3 from 'd3'
import { COLOR_UNMODIFIED, MARGIN, MODIFIED, ROOT_NODE_NAME } from './TreeConstants'
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
// ##### UPDATE TREE ########################################################################################
// ##########################################################################################################

// Toggle children.
function toggle(d: any) {
    d.children
        ? collapseChildren(d)
        : (d.children = d._children.filter((child: any) => child.data.isFiltered))
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

export function updateTree(
    event: any | null,
    sourceNode: any /*HierarchyPointNode<MyNode>*/,
    tree: Tree,
    svgSelections: SvgSelections,
    universePropsDict: Dictionary<UniverseProps>
) {
    let duration = 0

    if (event) {
        if (Object.values(CustomEventName).includes(event.type)) {
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
        } else {
            // if you press alt / option key, then the collapse/expand animation is much slower :D
            duration = event && event.altKey ? 2500 : 250
        }
    }

    // Compute the new treeLayout layout.
    tree.layout(tree.root)

    const nodes = tree.root.descendants().reverse()
    const links = tree.root.links().filter((link) => link.target.data.isFiltered)

    // TODO needed or can be removed?
    // console.debug(`${nodes.length} nodes, ${links.length} links visible`)

    // figure out the most left and most right node in a top-down treeLayout
    let left: any = tree.root
    let right: any = tree.root
    tree.root.eachBefore((node: any) => {
        if (node.x < left.x) left = node
        if (node.x > right.x) right = node
    })

    // TODO needed or can be removed?
    // take the far-most left and far-most right in a top-down treeLayout to get the height (because we have a horizontal treeLayout)
    const height = right.x - left.x + MARGIN.top + MARGIN.bottom

    // define a transition
    const transition = svgSelections.zoomG
        .transition()
        .duration(duration)
        .tween(
            'resize',
            window.ResizeObserver ? null : () => () => svgSelections.zoomG.dispatch('toggle')
        )

    // Update the nodes…
    const node = svgSelections.gNode.selectAll('g').data(nodes, (d: any) => d.id)

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node
        .enter()
        .append('g')
        .attr('transform', (d) => `translate(${sourceNode.y0},${sourceNode.x0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (evt, d: any) => {
            toggle(d)
            updateTree(evt, d, tree, svgSelections, universePropsDict)
        })

    let nodeEnterCircle = nodeEnter
        .append('circle')
        // .attr("r", (d: any) => d._children && d.id !== 0 ? 5 + (countPrivateLeaves(d) / 2) : 5)
        .attr('r', (d: any) => (d._children && d.id !== 0 ? 9 + d.data.codeSize / 2 : 9))
        .attr('fill', (d: any) => {
            if (d.data.universes.size == 1) {
                return universePropsDict[Array.from(d.data.universes).join('')].color.toString()
            } else if (d.data.isModified) {
                return universePropsDict[MODIFIED].color.toString()
            } else {
                return COLOR_UNMODIFIED.toString()
            }

            // d.data.universes.size == 0 ? '#555' : universePropsDict[Array.from(d.data.universes).join('')].color.toString()
        })
        .attr('stroke-width', 10)

    // see source code: https://d3-graph-gallery.com/graph/interactivity_tooltip.html
    // Three function that change the tooltip when user hover / move / leave a cell
    let mouseover = function (event: MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip.style('opacity', 1)
    }
    let mousemove = function (event: MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip
            .html(
                `**Node data:**
                            <br>codeSize: ${d.data.codeSize}
                            <br>isFiltered: ${d.data.isFiltered}
                            <br>isModified: ${d.data.isModified}
                            <br>universes: ${
                                universePropsDict[Array.from(d.data.universes).join('')].name
                            }
                            <br>has children: ${d.children?.length || undefined}
                            <br>has _children: ${(d as any)._children?.length || undefined}
                            `
            )
            .style('left', event.x + 20 + 'px')
            .style('top', event.y + 'px')
    }
    let mouseout = function (event: MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip.style('opacity', 0)
    }

    nodeEnterCircle
        .on('mouseover', (event, d) => mouseover(event, d))
        .on('mousemove', (event, d) => mousemove(event, d))
        .on('mouseout', (event, d) => mouseout(event, d))

    nodeEnter
        .append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => (d._children ? -6 : 6))
        .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
        .text((d) => d.data.name)
        .clone(true)
        .lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white')

    // Transition nodes to their new position.
    const nodeUpdate = node
        .merge(nodeEnter)
        .transition(transition)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1)

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node
        .exit()
        .transition(transition)
        .remove()
        .attr('transform', (d) => `translate(${sourceNode.y},${sourceNode.x})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)

    let linkGenerator = d3
        .linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x)

    // Update the links…
    const link = svgSelections.gLink.selectAll('path').data(links, (d: any) => d.target.id)

    // Enter any new links at the parent's previous position.
    const linkEnter = link
        .enter()
        .append('path')
        .attr('d', (d) => {
            const o = { x: sourceNode.x0, y: sourceNode.y0 }
            return linkGenerator({ source: o, target: o })
        })

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr('d', linkGenerator)

    // Transition exiting nodes to the parent's new position.
    link.exit()
        .transition(transition)
        .remove()
        .attr('d', (d) => {
            const o = { x: sourceNode.x, y: sourceNode.y }
            return linkGenerator({ source: o, target: o })
        })

    // Stash the old positions for transition.
    tree.root.eachBefore((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
    })
}
