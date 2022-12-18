import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualizationSVG from "./Visualizations/TreeVisualizationSVG";

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualizationSVG()
    tree.generate()
}
