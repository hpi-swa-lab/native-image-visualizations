/// The base node that can represent all the packages, classes, and methods in
/// an image.
export default interface Node {
    name: string
    type: NodeType
    children: Node[]
}

export enum NodeType {
    RootNode,
    Package,
    Class,
    Method
}
