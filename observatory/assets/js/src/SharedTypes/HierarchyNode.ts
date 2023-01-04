import { Node } from './Node'

export type HierarchyNode = Node & {
    id: number
    parent: HierarchyNode | null
    children: HierarchyNode[]
    fullPath: string
    subTreeSize: number
}