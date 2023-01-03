import VennVisualization from './Visualizations/VennVisualization'
import SankeyTreeVisualization from "./Visualizations/tree/SankeyTreeVisualization";
import TreeVisualization from "./Visualizations/tree/TreeVisualization";

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}

export function generateSankeyTree() {
    let sankeyTree = new SankeyTreeVisualization()
    sankeyTree.generate()
}
