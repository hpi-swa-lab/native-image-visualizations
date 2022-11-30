import * as d3 from "d3"
import Visualization from "./Visualization"
import CircleNode from "../SharedInterfaces/CircleNode"
import HierarchyNode from "../SharedInterfaces/HierarchyNode"
import { randomColor, randomInteger } from "../utils"

export default class ClassBubbles implements Visualization {

    hierarchy: HierarchyNode;
    nodes: CircleNode[] = [];
    bubbleRadius: number = 5;

    constructor() {}

    generate(): void {
        this.constructNodes()
        this.prepareSVG()
        this.addNodesToSVG()
    }

    constructNodes(): void {
        let leafs = this.getLeafNodes(this.hierarchy)
        let colorMapping: {[id: string]: string} = {}

        leafs.forEach((leaf: HierarchyNode) => {
            const colorIdentifyer: string = this.getColorIdentifyerForNode(leaf)
            let color: string = this.getUniqueColor(colorIdentifyer, colorMapping)
            colorMapping[colorIdentifyer] = color

            const newNode: CircleNode = {
                x: randomInteger(0, 100),
                y: randomInteger(0, 100),
                color: color,
                label: leaf.name,
                radius: 30
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

    getUniqueColor(identifyer: string, colorMapping: {[id: string]: string}): string {
        if (colorMapping[identifyer]) return colorMapping[identifyer];

        const colors: string[] = Object.values(colorMapping)
        let generatedColor = randomColor()
        while(colors.includes(generatedColor)) {
            generatedColor = randomColor()
        }

        return generatedColor
    }

    getLeafNodes(startingPoint: HierarchyNode): HierarchyNode[] {
        let leafs: HierarchyNode[] = []

        if (startingPoint.children.length === 0) {
            leafs = [startingPoint]
        } else {
            startingPoint.children.forEach(child => {
                leafs = leafs.concat(this.getLeafNodes(child))
            })
        }
        return leafs
    }

    prepareSVG(): void {
        let svg = d3.select('#container')
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", function (event) {
                svg.attr("transform", event.transform)
            }))
            .append("g")
    }

    addNodesToSVG(): void {
        d3.select("svg g")
            .selectAll('circle')
            .data(this.nodes)
            .join('circle')
            .attr('r', (node: CircleNode) => node.radius)
            .style('fill', (node: CircleNode) => node.color)
            .attr('cx', (node: CircleNode) => node.x)
            .attr('cy', (node: CircleNode) => node.y)
        
        d3.select("svg g")
            .selectAll('text')
            .data(this.nodes)
            .join('text')
            .text((node: CircleNode) => node.label)
            .attr('font-size', (node: CircleNode) => (node.radius / 2 + 'px'))
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('x', (node: CircleNode) => node.x)
            .attr('y', (node: CircleNode) => node.y)
    }
}
