export default interface HierarchyNode {
    parent: HierarchyNode | null,
    fullPath: string,
    name: string,
    children: HierarchyNode[]
}