import * as d3 from 'd3'
import {
    countPrivateLeaves,
} from './TreeUtils'

import TreeVisualization from "./TreeVisualization";
import {Dictionary, NodeTextPositionOffset, UniverseProps} from "./TreeTypes";
import {COLOR_UNMODIFIED, MODIFIED} from "./TreeConstants";
import {Transition} from "d3";

export default class BubbleTreeVisualization extends TreeVisualization {

    constructor(universeTexts: string[], universeNames: string[]) {
        super(universeTexts, universeNames)
    }

    // #############################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################
    // #############################################################################

    getNodeSeparation(a: d3.HierarchyPointNode<unknown>, b:  d3.HierarchyPointNode<unknown>, dx:number) {
        let totalWidth = countPrivateLeaves(a) / 2 + countPrivateLeaves(b) / 2
        return totalWidth / dx + 1
    }

    getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: -6,
            end: 6
        }
    }

    appendShapeToNode(nodeEnter: any, universePropsDict: Dictionary<UniverseProps>): any {
        return nodeEnter
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
    }

    enterLink(
        link: any,
        linkGenerator: d3.Link<any, any, any>,
        sourceNode: any /*HierarchyPointNode<MyNode>*/
    ) {
        // Enter any new links at the parent's previous position.
        return link
            .enter()
            .append('path')
            .attr('d', (d:any) => {
                const o = { x: sourceNode.x0, y: sourceNode.y0 }
                return linkGenerator({ source: o, target: o })
            })
    }

    updateLink(
        link: any,
        linkEnter: any,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>,
        linkGenerator: d3.Link<any, any, any>
    ) {
        // Transition links to their new position.
        return link.merge(linkEnter).transition(transition).attr('d', linkGenerator)
    }
}
