import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'

export function generateVenn() {
    let venn = new TreeVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}
