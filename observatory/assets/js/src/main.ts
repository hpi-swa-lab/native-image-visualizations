import ClassBubbles from "./Visualizations/ClassBubbles";
import VennVisualization from './Visualizations/VennVisualization'
import TreeVisualization from './Visualizations/TreeVisualization'

export function generateClassBubbles(classes: string[]) {
    const visualization = new ClassBubbles()
    visualization.classes = classes
    visualization.generate()
}

export function generateVenn() {
    let venn = new TreeVisualization()
    venn.generate()
}

export function generateTree() {
    let tree = new TreeVisualization()
    tree.generate()
}
