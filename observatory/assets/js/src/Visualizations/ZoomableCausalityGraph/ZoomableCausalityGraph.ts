import * as d3 from 'd3'

import Visualization from '../Visualization'
import CausalityNode from './Interfaces/CausalityNode'
import CausalityEdge from './Interfaces/CausalityEdge'
import CausalityHierarchyNode from './Classes/CausalityHierarchyNode'
import Edge from '../../SharedInterfaces/Edge'
import Tooltip from '../../Components/Tooltip'
import { forceCollide, forceLink, forceSimulation } from 'd3'

export default class ZoomableCausalityGraph implements Visualization {
    nodesById: Record<number, CausalityHierarchyNode>
    root: CausalityHierarchyNode
    nodesToDisplay: CausalityHierarchyNode[]
    edgesToDisplay: Edge[]

    simulation: d3.Simulation<CausalityHierarchyNode, undefined>

    tooltip: Tooltip

    currentScale: number

    constructor(nodesById: Record<number, CausalityNode>) {
        this.tooltip = new Tooltip()
        document.body.appendChild(this.tooltip.widget)
        
        this.nodesById = {}

        Object.values(nodesById).forEach((node: CausalityHierarchyNode) => {
            this.nodesById[node.id] = CausalityHierarchyNode.fromCausalityNode(node)
        })

        this.root = CausalityHierarchyNode.buildHierarchy(Object.values(this.nodesById))
        this.nodesToDisplay = this.root.id === -1 ? this.root.children : [this.root]

        this.currentScale = 1

        this.updateEdgesToDisplay()

        this.simulation = forceSimulation(this.nodesToDisplay)
            .force('link', forceLink(this.edgesToDisplay))
            .force(
                'collision',
                forceCollide().radius((node: CausalityHierarchyNode) => node.radius * 1.1)
            )
            .on('tick', () => this._tick())

        this.simulation.stop()
    }

    generate(): void {
        let svg = d3
            .select('#container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .call(
                d3.zoom().on('zoom', (event) => {
                    svg.attr('transform', event.transform)

                    const scale = event.transform.k

                    console.log(event.transform, this.currentScale, scale / this.currentScale > 70)

                    if (this.currentScale / scale > 70) {
                        this.currentScale = scale
                        // TODO: zoom out
                    }
                    if (scale / this.currentScale > 70) {
                        this.currentScale = scale
                        // TODO: zoom in
                        const visibleNodes = this.getVisibleNodes(event.transform)
                        if (visibleNodes.length > 1) {
                            // TODO: show the inner workings of that node
                        }
                    }
                })
            )
            .append('g')
    }

    getVisibleNodes(transform: any): CausalityHierarchyNode[] {
        // TODO: filter out node that are not inside the current view port
        return this.nodesToDisplay.filter((node: CausalityHierarchyNode) => true)
    }

    continueSimulation(callback: () => void = () => {}, milliseconds: number = 5000) {
        this.simulation.restart()
        setTimeout(() => {
            this.simulation.stop()
            callback()
        }, milliseconds)
    }

    _tick(){
        d3.select('svg g')
            .selectAll('circle')
            .data(this.nodesToDisplay)
            .join('circle')
            .attr('r', (node: CausalityHierarchyNode) => node.radius)
            .attr('fill', (node: CausalityHierarchyNode) => node.color)
            .attr('cx', (node: CausalityHierarchyNode) => node.x)
            .attr('cy', (node: CausalityHierarchyNode) => node.y)
            .on('mouseover', (event, node: CausalityHierarchyNode) => {
                this.tooltip.title = node.display
                this.tooltip.datapoints = {
                    display: node.display,
                    name: node.name,
                    type: node.type,
                }
                this.tooltip.setVisible()
            })
            .on('mousemove', (event) => {
                this.tooltip.moveToCoordinates(event.pageY - 10, event.pageX + 10)
            })
            .on('mouseout', (event, node: CausalityHierarchyNode) => {
                this.tooltip.setInvisible()
            })

        d3.select('svg g')
            .selectAll('text')
            .data(this.nodesToDisplay)
            .join('text')
            .text((node: CausalityHierarchyNode) => node.display)
            .attr('font-size', (node: CausalityHierarchyNode) => node.radius / 2 + 'px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('x', (node: CausalityHierarchyNode) => node.x)
            .attr('y', (node: CausalityHierarchyNode) => node.y)
    }

    updateEdgesToDisplay() {
        this.edgesToDisplay = []
        this.nodesToDisplay.forEach((node: CausalityHierarchyNode) => {
            node.directEdges.forEach((edge: CausalityEdge) => {
                const source = this.findNodeInCurrentNodes(edge.sourceId)

                if (source) {
                    const target = this.findNodeInCurrentNodes(edge.targetId)

                    if (target) {
                        this.edgesToDisplay.push({
                            source: this.nodesToDisplay.indexOf(source),
                            target: this.nodesToDisplay.indexOf(target),
                            weight: 1
                        })
                    }
                }
            })
        })
    }

    findNodeInCurrentNodes(id: number) {
        return this.nodesToDisplay.find((node: CausalityHierarchyNode) => (node.id = id))
    }
}
