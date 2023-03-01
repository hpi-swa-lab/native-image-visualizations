export enum SwappableComponentType {
    VennSets,
    SankeyTree,
    TreeLine,
    CausalityGraph,
    Home,
    None,
    CutTool
}

export function componentName(component: SwappableComponentType | undefined) {
    switch (component) {
        case SwappableComponentType.VennSets:
            return 'Venn Sets'
        case SwappableComponentType.SankeyTree:
            return 'Sankey Tree'
        case SwappableComponentType.TreeLine:
            return 'Tree Line'
        case SwappableComponentType.CausalityGraph:
            return 'Causality Graph'
        case SwappableComponentType.Home:
            return 'Home'
        case SwappableComponentType.CutTool:
            return 'Cut Tool'
        default:
            return '<Error>'
    }
}
