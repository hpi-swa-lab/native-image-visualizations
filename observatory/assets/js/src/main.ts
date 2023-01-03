import { loadTextFile, parseToCleanedPackageHierarchy } from './BuildReportsParser'
import HierarchyBubbles from './Visualizations/HierarchyBubbles'
import { createTreeLineVisualization } from './Visualizations/TreeLineVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import VennVisualization from './Visualizations/VennVisualization'

export async function generateHierarchyBubbles(file: File): Promise<HierarchyBubbles> {
    const inputString = await loadTextFile(file)
    const hierarchy = parseToCleanedPackageHierarchy(inputString)

    const visualization = new HierarchyBubbles(hierarchy)
    visualization.generate()

    return visualization
}

export function generateVenn() {
    let venn = new VennVisualization()
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
    console.log('Creating tree line')
    let tree = await createTreeLineVisualization()
    console.log('Generating')
    tree.generate()
    console.log('Generated tree line')
}

