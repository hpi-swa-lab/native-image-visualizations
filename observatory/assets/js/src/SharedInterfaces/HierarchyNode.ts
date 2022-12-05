export default interface HierarchyNode {
    id: number
    parent: HierarchyNode | null
    fullPath: string
    name: string
    children: HierarchyNode[]
}
