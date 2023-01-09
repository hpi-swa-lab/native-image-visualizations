import HierarchyBubbles from './Visualizations/HierarchyBubbles'
import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'
import {
    loadTextFile,
    loadBuildReport,
    parseToCleanedPackageHierarchy,
    parseBuildReportToNodeWithSizeHierarchy
} from './BuildReportsParser'

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

export async function testBuildReportParser(file: File) {
    const reportData = await loadBuildReport(file)
    console.log('Report data: ', reportData)

    const parsedHierarchy = parseBuildReportToNodeWithSizeHierarchy(reportData)
    console.log('Parsed hierarchy: ', parsedHierarchy)
}
