import NodeWithSize from "./NodeWithSize";
import HierarchyNode from "./HierarchyNode";

export default interface HierarchyNodeWithSize extends Omit<HierarchyNode, 'children'|'parent'>, Omit<NodeWithSize, 'children'> {
    parent: HierarchyNodeWithSize | null
    children: HierarchyNodeWithSize[]
    accumulatedCodeSize: number
}