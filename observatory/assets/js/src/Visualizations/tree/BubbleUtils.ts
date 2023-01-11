import * as d3 from 'd3'
import { COLOR_UNMODIFIED, MODIFIED } from './TreeConstants'
import {
    CustomEventName,
    Dictionary,
    SvgSelections,
    Tree,
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

export function updateBubbleTree(
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

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = enterNode(node, sourceNode, (evt: MouseEvent, d: any) => {
        toggle(d, evt.shiftKey)
        updateBubbleTree(evt, d, tree, svgSelections, universePropsDict)
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

    nodeEnterCircle
        .on('mouseover', (event: MouseEvent, d: any) => mouseover(event, d, svgSelections))
        .on('mousemove', (event: MouseEvent, d: any) =>
            mousemove(event, d, svgSelections, universePropsDict)
        )
        .on('mouseout', (event: MouseEvent, d: any) => mouseout(event, d, svgSelections))

    appendTextToNode(nodeEnter, -6, 6)

    updateNode(node, nodeEnter, transition)
    exitNode(node, sourceNode, transition)

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

    exitLink(link, linkGenerator, sourceNode, transition)

    // Stash the old positions for transition.
    tree.root.eachBefore((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
    })
}
