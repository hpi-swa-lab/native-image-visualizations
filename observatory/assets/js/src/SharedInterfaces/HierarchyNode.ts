import Node from './Node'

export default interface HierarchyNode extends Omit<Node, 'children'> {
    id: number
    parent: HierarchyNode | null
    children: HierarchyNode[]
    fullPath: string
    subTreeSize: number
}