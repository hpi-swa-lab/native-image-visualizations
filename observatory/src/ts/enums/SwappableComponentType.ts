export enum SwappableComponentType {
    VennSets = 'venn-sets',
    SankeyTree = 'sankey-tree',
    TreeLine = 'tree-line',
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
        case SwappableComponentType.Home:
            return 'Home'
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
