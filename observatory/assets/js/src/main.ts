import * as d3 from 'd3'
import { parseUsedMethods, withSizes } from './parser'
import { TreeLineVisualization } from './Visualizations/TreeLineVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import VennVisualization from './Visualizations/VennVisualization'

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}

export async function generateTreeLine() {
    let universes = new Map()
    for (const example of ['micronaut', 'micronaut-no-log4j']) {
        const text = await d3.text(`/data/used-methods-${example}.txt`)
        universes.set(example, withSizes(parseUsedMethods(text)))
    }

    console.log('Creating tree line visualization')
    let tree = new TreeLineVisualization(
        universes,
        new Map(
            Object.entries({
                // 'helloworld': '#f28e2c',
                micronaut: '#1b9e77',
                // 'micronaut': '#ffdd00',
                'micronaut-no-log4j': '#72286f'
            })
        )
    )
    console.log('Generating visualization')
    tree.generate()
}

