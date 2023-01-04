import { NodeWithSize } from "./NodeWithSize";
import { HierarchyNode } from "./HierarchyNode";

export type HierarchyNodeWithSize = HierarchyNode & NodeWithSize & {
    parent: HierarchyNodeWithSize | null
    children: HierarchyNodeWithSize[]
}