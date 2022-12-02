import ClassBubbles from './Visualizations/ClassBubbles'
import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import { loadTextFile } from './BuildReportsParser'
import { parseToCleanedPackageHierarchy } from './BuildReportsParser'

export async function generateClassBubbles(file: File) {
    const input_string = await loadTextFile(file)
    const hierarchy = parseToCleanedPackageHierarchy(input_string)

    const visualization = new ClassBubbles()
    visualization.hierarchy = hierarchy
    visualization.generate()
}

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}
