import * as d3 from "d3"
import Visualization from "../interfaces/Visualization"
import CircleNode from "./CircleNode"
import { randomColor } from "../utils"

export default class ClassBubbles implements Visualization {

    classes: string[] = [];

    constructor() {}

    generate(): void {
        let nodes = this.constructNodes()
        let svg = this.prepareSVG()
        this.addNodesToSVG(nodes, svg)
    }

    constructNodes(): CircleNode[] {
        const result: CircleNode[] = []

        this.classes.forEach((class_name: string) => {
            const newNode: CircleNode = {
                x: 0,
                y: 0,
                color: randomColor(),
                label: class_name,
                radius: 5
            }
            result.push(newNode)
        })

        return result;
    }

    prepareSVG(): SVGElement {
        let svg = d3.select('#container')
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", (event) => {
                svg.attr("transform", event.transform)
            }))
        
        return svg
    }

    addNodesToSVG(nodes: CircleNode[], svg: SVGElement): void {
        d3.select(svg)
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', (d) => d.radius)
            .style('fill', (d) => d.color)
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
        
        d3.select(svg)
            .selectAll('text')
            .data(nodes)
            .join('text')
            .text((d) => d.label)
            .attr('font-size', (d) => d.radius / 2 + 'px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
    }
}