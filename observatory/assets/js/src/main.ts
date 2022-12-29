import VennVisualization from './Visualizations/VennVisualization'
import SankeyVisualization from "./Visualizations/tree/SankeyVisualization";

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new SankeyVisualization()
    tree.generate()
}
