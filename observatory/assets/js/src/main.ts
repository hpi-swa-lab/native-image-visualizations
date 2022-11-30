import ClassBubbles from "./visualizations/ClassBubbles";

export function generateClassBubbles(classes: string[]) {
    const visualization = new ClassBubbles()
    visualization.classes = classes
    visualization.generate()
}
