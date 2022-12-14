import HierarchyBubbles from './Visualizations/HierarchyBubbles'
import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import { loadTextFile } from './BuildReportsParser'
import { parseToCleanedPackageHierarchy, parseBuildReportToNodeWithSizeHierarchy } from './BuildReportsParser'

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

export function testBuildReportParser() {
    let reports: Record<string, any>[] = [{
        'name': 'com.oracle.test$testSomething$testSomethingElse.toString():String',
        'size': 50
    }]

    return parseBuildReportToNodeWithSizeHierarchy(reports)
}
