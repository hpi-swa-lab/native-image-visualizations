import * as d3 from 'd3'
import {Transition} from 'd3'
import {
    countPrivateLeaves,
} from './TreeUtils'
import {
    COLOR_BLUE,
    COLOR_GREY,
     COLOR_UNMODIFIED,
    MODIFIED,
} from './TreeConstants'
import {
    Dictionary,
    NodeTextPositionOffset,
    UniverseProps
} from './TreeTypes'
import TreeVisualization from "./TreeVisualization";

export default class SankeyTreeVisualization extends TreeVisualization {


    constructor(universeTexts: string[], universeNames: string[]) {
        this.universesMetadata = {}
        this.filter = {
            diffing: {
                universes: new Set(['0', '1']),
                // universes: new Set(
                //     Object.keys(this.universesMetadata).filter((key) => key.length == 1)
                // ),
                showUnmodified: false
            },
            sorting: {
                option: SortingOption.NAME,
                order: SortingOrder.ASCENDING
            }
        }

        this.tree = this.buildTree(universeTexts, universeNames)
    }

    // #############################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################
    // #############################################################################

    getNodeSeparation(a: d3.HierarchyPointNode<unknown>, b:  d3.HierarchyPointNode<unknown>, dx:number) {
        let totalWidth = countPrivateLeaves(a) + countPrivateLeaves(b)
        return totalWidth / dx + 1
    }

    appendShapeToNode(nodeEnter: any, universePropsDict: Dictionary<UniverseProps>) {
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

    enterLink(
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

    updateLink(
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

    getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: -6,
            end: 26
        }
    }
}
