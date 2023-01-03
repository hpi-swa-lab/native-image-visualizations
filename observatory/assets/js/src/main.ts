// import * as d3 from 'd3'
// import { parseUsedMethods, withSizes } from './parser'
import { createTreeLineVisualization } from './Visualizations/TreeLineVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'

export function generateVenn() {
    let venn = new TreeVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}

export async function generateTreeLine() {
    // let universes = new Map()
    // for (const example of ['micronaut', 'no-log4j']) {
    //     const text = await d3.text(`used-methods-${example}.txt`)
    //     universes.set(example, withSizes(parseUsedMethods(text)))
    // }

    // let tree = new TreeLineVisualization(
    //     universes,
    //     new Map(
    //         Object.entries({
    //             // 'helloworld': '#f28e2c',
    //             micronaut: '#1b9e77',
    //             // 'micronaut': '#ffdd00',
    //             'no-log4j': '#72286f'
    //         })
    //     )
    // )
    let tree = await createTreeLineVisualization()
    tree.generate()
}

