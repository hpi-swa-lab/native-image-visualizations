import * as d3 from 'd3'
import Visualization from './Visualization'

export default class VennVisualization implements Visualization {
    container: HTMLElement

    constructor(container: HTMLElement) {
        this.container = container
    }

    generate(): void {
        console.log('This will soon be a nice Venn')
        const svg = d3.select(this.container).append('svg').attr('width', 200).attr('height', 200)

        svg.append('circle')
            .attr('cx', 100)
            .attr('cy', 100)
            .attr('r', 50)
            .attr('stroke', 'black')
            .attr('fill', '#69a3b2')
    }
}
