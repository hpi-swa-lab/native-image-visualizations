export enum SwappableComponentType {
    VennSets,
    SankeyTree,
    TreeLine,
    CausalityGraph,
    Home,
    None
}

export function componentName(component: SwappableComponentType | undefined): string {
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
        default:
            return '<Error>'
    }
}

export function serializeComponent(component: SwappableComponentType): string {
    return component.toString()
}
