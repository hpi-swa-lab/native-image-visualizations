export type Node = {
    name: string
    type: NodeType
    children: Node[]
}

export enum NodeType {
    Package,
    Class,
    Method
}
