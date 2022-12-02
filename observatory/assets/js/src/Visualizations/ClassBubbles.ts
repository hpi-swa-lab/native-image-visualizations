import * as d3 from 'd3'
import Visualization from './Visualization'
import CircleNode from '../SharedInterfaces/CircleNode'
import HierarchyNode from '../SharedInterfaces/HierarchyNode'
import { randomColor, randomInteger } from '../utils'

export default class ClassBubbles implements Visualization {
    hierarchy: HierarchyNode
    nodes: CircleNode[] = []
    bubbleRadius: number = 5

    constructor() {}

    generate(): void {
        this.constructNodes()
        this.prepareSVG()
        this.addNodesToSVG()
    }

    constructNodes(): void {
        let leafs = this.getLeafNodes(this.hierarchy)
        let colorMapping: { [id: string]: string } = {}

        const columns = Math.floor(Math.sqrt(leafs.length))
        const radius = 30
        const diameter = radius * 2
        const padding = 5

        leafs.forEach((leaf: HierarchyNode, index: number) => {
            const colorIdentifyer: string = this.getColorIdentifyerForNode(leaf)
            let color: string = this.getUniqueColor(colorIdentifyer, colorMapping)
            colorMapping[colorIdentifyer] = color

            const newNode: CircleNode = {
                x:
                    Math.floor(index % columns) * diameter +
                    (Math.floor(index % columns) - 1) * padding,
                y:
                    Math.floor(index / columns) * diameter +
                    (Math.floor(index / columns) - 1) * padding,
                color: color,
                label: leaf.name,
                radius: 30,
                tooltip: leaf.fullPath
            }
            this.nodes.push(newNode)
        })
    }

    getColorIdentifyerForNode(node: HierarchyNode): string {
        if (node.parent === null) {
            return node.fullPath
        }
        return node.parent.fullPath
    }

    getUniqueColor(identifyer: string, colorMapping: { [id: string]: string }): string {
        if (colorMapping[identifyer]) return colorMapping[identifyer]

        const colors: string[] = Object.values(colorMapping)
        let generatedColor = randomColor()
        while (colors.includes(generatedColor)) {
            generatedColor = randomColor()
        }

        return generatedColor
    }

    getLeafNodes(startingPoint: HierarchyNode): HierarchyNode[] {
        let leafs: HierarchyNode[] = []

        if (startingPoint.children.length === 0) {
            leafs = [startingPoint]
        } else {
            startingPoint.children.forEach((child) => {
                leafs = leafs.concat(this.getLeafNodes(child))
            })
        }
        return leafs
    }

    prepareSVG(): void {
        let svg = d3
            .select('#container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .call(
                d3.zoom().on('zoom', function (event) {
                    svg.attr('transform', event.transform)
                })
            )
            .append('g')
    }

    addNodesToSVG(): void {
        const tooltip = d3
            .select('body')
            .append('div')
            .style('position', 'absolute')
            .style('width', 'fit-content')
            .style('z-index', '999')
            .style('visibility', 'hidden')
            .style('background', '#ffffff')
            .style('border-style', 'solid')
            .style('border-width', '1px')
            .style('border-color', 'black')
            .style('border-radius', '5px')
            .style('padding', '10px')
            .style(
                'box-shadow', 
                '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)'
            )
            .text('a simple tooltip')

        d3.select('svg g')
            .selectAll('circle')
            .data(this.nodes)
            .join('circle')
            .attr('r', (node: CircleNode) => node.radius)
            .style('fill', (node: CircleNode) => node.color)
            .attr('cx', (node: CircleNode) => node.x)
            .attr('cy', (node: CircleNode) => node.y)
            .on('mouseover', (event, node: CircleNode) => {
                d3.selectAll('circle')
                    .data(this.nodes)
                    .join('circle')
                    .style('fill', (nodeToColorOut: CircleNode) => nodeToColorOut.color + '22')

                d3.select(event.target).style(
                    'fill',
                    (nodeToColorIn: CircleNode) => nodeToColorIn.color
                )

                tooltip.text(node.tooltip).style('visibility', 'visible')
            })
            .on('mousemove', (event) => {
                tooltip.style('top', event.pageY - 10 + 'px').style('left', event.pageX + 10 + 'px')
            })
            .on('mouseout', (event, node: CircleNode) => {
                d3.selectAll('circle')
                    .data(this.nodes)
                    .join('circle')
                    .style('fill', (nodeToColorIn: CircleNode) => nodeToColorIn.color)

                tooltip.style('visibility', 'hidden')
            })

        d3.select('svg g')
            .selectAll('text')
            .data(this.nodes)
            .join('text')
            .text((node: CircleNode) => node.label)
            .attr('font-size', (node: CircleNode) => node.radius / 2 + 'px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('x', (node: CircleNode) => node.x)
            .attr('y', (node: CircleNode) => node.y)
    }
}
