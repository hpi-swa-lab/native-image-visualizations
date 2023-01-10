import { HierarchyPointNode, Transition } from 'd3'
import * as d3 from 'd3'
import { COLOR_UNMODIFIED, MARGIN, MODIFIED } from './TreeConstants'
import {
    CustomEventName,
    Dictionary,
    MyNode,
    NodesSortingFilter,
    Tree,
    SortingOption,
    SortingOrder,
    SvgSelections,
    UniverseProps
} from './TreeTypes'
import { collapseChildren } from './TreeUtils'

// ##########################################################################################################
// ##### UPDATE TREE ########################################################################################
// ##########################################################################################################

export function updateSankey(
    event: any | null,
    sourceNode: any /*HierarchyPointNode<MyNode>*/,
    tree: Tree,
    svgSelections: SvgSelections,
    universePropsDict: Dictionary<UniverseProps>
) {
    let duration = 0

    if (event) {
        if (Object.values(CustomEventName).includes(event.type)) {
            handleCustomTreeEvent(event, tree)
        } else {
            // if you press alt / option key, then the collapse/extend animation is much slower :D
            duration = event && event.altKey ? 2500 : 250
        }
    }

    // Compute the new treeLayout layout.
    tree.layout(tree.root)

    const nodes = tree.root.descendants().reverse()
    const links = tree.root.links().filter((link) => link.target.data.isFiltered)

    // Stash the old positions for transition.
    tree.root.eachBefore((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
    })

    // TODO needed or can be removed?
    // console.debug(`${nodes.length} nodes, ${links.length} links visible`)

    // figure out the most left and most right node in a top-down treeLayout
    let left: any = tree.root
    let right: any = tree.root
    tree.root.eachBefore((node: any) => {
        if (node.x < left.x) left = node
        if (node.x > right.x) right = node
    })

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

    const nodeEnter = enterNode(node, sourceNode, (evt: MouseEvent, d: any) => {
        toggle(d, evt.shiftKey)
        updateSankey(evt, d, tree, svgSelections, universePropsDict)
    })
    const nodeEnterRect = appendRectToNode(nodeEnter, universePropsDict)
    nodeEnterRect
        .on('mouseover', (event: MouseEvent, d: any) => mouseover(event, d, svgSelections))
        .on('mousemove', (event: MouseEvent, d: any) =>
            mousemove(event, d, svgSelections, universePropsDict)
        )
        .on('mouseout', (event: MouseEvent, d: any) => mouseout(event, d, svgSelections))
    appendTextToNode(nodeEnter)

    updateNode(node, nodeEnter, transition)

    exitNode(node, sourceNode, transition)

    let linkGenerator = d3
        .linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x)

    // Update the links…
    const link = svgSelections.gLink.selectAll('path').data(links, (d: any) => d.target.id)

    const linkEnter = enterLink(link, linkGenerator, sourceNode)

    updateLink(link, linkEnter, transition, linkGenerator)

    exitLink(link, linkGenerator, sourceNode, transition)
}

// ##########################################################################################################
// ##### UPDATE TREE UTILS ##################################################################################
// ##########################################################################################################

function enterNode(node: any, sourceNode: any, onClickCallback: Function) {
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

function appendRectToNode(nodeEnter: any, universePropsDict: Dictionary<UniverseProps>) {
    const minSize = 20
    return nodeEnter
        .append('rect')
        .attr('width', function () {
            return minSize
        })
        .attr('height', (d: any) => (d._children ? minSize + d.data.codeSize : minSize))
        .attr('y', (d: any) => (d.data ? -(d.data.codeSize + minSize) / 2 : 0))
        .style('fill', (d: any) => {
            if (d.data.universes.size == 1) {
                return universePropsDict[Array.from(d.data.universes).join('')].color.toString()
            } else if (d.data.isModified) {
                return universePropsDict[MODIFIED].color.toString()
            } else {
                return COLOR_UNMODIFIED.toString()
            }
        })
}

function appendTextToNode(node: any) {
    return (
        node
            .append('text')
            .attr('dy', '0.31em')
            // TODO set end-position relative to node-width
            .attr('x', (d: any) => (d._children ? -6 : 26))
            .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
            .text((d: any) => d.data.name)
            .clone(true)
            .lower()
            .attr('stroke-linejoin', 'round')
            .attr('stroke-width', 3)
            .attr('stroke', 'white')
    )
}

function updateNode(
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

function exitNode(
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

function enterLink(
    link: any,
    linkGenerator: d3.Link<any, any, any>,
    sourceNode: any /*HierarchyPointNode<MyNode>*/
) {
    // Enter any new links at the parent's previous position.
    return link
        .enter()
        .append('path')
        .attr('d', (d: any) => {
            const o = { x: sourceNode.x0, y: sourceNode.y0 }
            return linkGenerator({ source: o, target: o })
        })
        .attr('stroke-width', (d: any) => d.target.data.codeSize)
        .attr('stroke', (d: any) => (d.target.data.isModified ? '#4989c5' : '#969696'))
}

function updateLink(
    link: any,
    linkEnter: any,
    transition: Transition<SVGGElement, unknown, HTMLElement, any>,
    linkGenerator: d3.Link<any, any, any>
) {
    // Transition links to their new position.
    return link
        .merge(linkEnter)
        .transition(transition)
        .attr('d', (d: any) => {
            const targetsIndex = d.source.children.indexOf(d.target)
            let sourceX = d.source.children
                .map((child: any, index: number) => {
                    if (index >= targetsIndex) return 0
                    return child.data ? child.data.codeSize : 0
                })
                .reduce((a: any, b: any, c: number) => {
                    return a + b
                })
            sourceX += d.source.x - d.source.data.codeSize / 2
            sourceX += d.target.data.codeSize / 2
            const source = { x: sourceX, y: d.source.y0 }
            return linkGenerator({ source: source, target: d.target })
        })
}

function exitLink(
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

// see source code: https://d3-graph-gallery.com/graph/interactivity_tooltip.html
// Three function that change the tooltip when user hover / move / leave a cell
function mouseover(event: MouseEvent, d: HierarchyPointNode<MyNode>, svgSelections: SvgSelections) {
    svgSelections.tooltip.style('opacity', 1)
}
function mousemove(
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
function mouseout(event: MouseEvent, d: HierarchyPointNode<MyNode>, svgSelections: SvgSelections) {
    svgSelections.tooltip.style('opacity', 0)
}

// Toggle children.
function toggle(d: any, doToggleBranch: boolean) {
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

function handleCustomTreeEvent(event: any, tree: Tree) {
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
