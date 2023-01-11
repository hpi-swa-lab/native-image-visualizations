import { Transition } from 'd3'
import * as d3 from 'd3'
import { COLOR_BLUE, COLOR_GREY, COLOR_UNMODIFIED, MODIFIED } from './TreeConstants'
import {
    CustomEventName,
    Dictionary,
    Tree,
    SvgSelections,
    UniverseProps
} from './TreeTypes'
import {
    appendTextToNode,
    enterNode,
    exitLink,
    exitNode,
    handleCustomTreeEvent,
    mousemove,
    mouseout,
    mouseover,
    toggle,
    updateNode
} from './Utils'

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

    appendTextToNode(nodeEnter, -6, 26)

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
// ##### UPDATE SANKEY UTILS ################################################################################
// ##########################################################################################################

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
        .attr('stroke', (d: any) =>
            d.target.data.isModified ? COLOR_BLUE.toString() : COLOR_GREY.toString()
        )
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
