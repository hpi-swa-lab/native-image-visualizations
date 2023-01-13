import HierarchyBubbles from '../../../../observatory2/src/Visualizations/HierarchyBubbles'
import VennVisualization from '../../../../observatory2/src/Visualizations/VennVisualization'
import TreeVisualization from '../../../../observatory2/src/Visualizations/TreeVisualization'
import { loadBuildReport, parseBuildReportToNodeWithSizeHierarchy } from './BuildReportsParser'

export async function generateHierarchyBubbles(file: File): Promise<HierarchyBubbles> {
    const reportData = await loadBuildReport(file)
    const hierarchy = parseBuildReportToNodeWithSizeHierarchy(reportData, true)

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
