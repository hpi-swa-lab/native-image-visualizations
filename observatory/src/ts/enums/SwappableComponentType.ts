export enum SwappableComponentType {
    VennSets = 'venn-sets',
    SankeyTree = 'sankey-tree',
    TreeLine = 'tree-line',
    CausalityGraph = 'causality-graph',
    CutTool = 'cut-tool',
    Home = 'home',
    None = 'none'
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
        case SwappableComponentType.CutTool:
            return 'Cut Tool'
        default:
            return '<Error>'
    }
}

export function serializeComponent(component: SwappableComponentType): string {
    return component.toString()
}

export function deserializeComponent(componentName: string): SwappableComponentType | undefined {
    return Object.values(SwappableComponentType).find((component) => component === componentName)
}
