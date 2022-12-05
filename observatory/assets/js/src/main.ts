import ClassBubbles from './Visualizations/ClassBubbles'
import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import { loadTextFile } from './BuildReportsParser'
import { parseToCleanedPackageHierarchy } from './BuildReportsParser'

export async function generateClassBubbles(file: File): Promise<ClassBubbles> {
    const inputString = await loadTextFile(file)
    const hierarchy = parseToCleanedPackageHierarchy(inputString)

    const visualization = new ClassBubbles(hierarchy)
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
