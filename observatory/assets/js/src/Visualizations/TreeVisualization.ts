import Visualization from "./Visualization"
import * as d3 from 'd3'

export default class TreeVisualization implements Visualization {
    constructor() {}

    generate(): void {
        console.log('This will soon be a nice Tree')
        var svg = d3.select('body').append('svg').attr('width', 200).attr('height', 200)

        svg.append('circle')
            .attr('cx', 100)
            .attr('cy', 100)
            .attr('r', 50)
            .attr('stroke', 'black')
            .attr('fill', '#69a3b2')
    }
}
