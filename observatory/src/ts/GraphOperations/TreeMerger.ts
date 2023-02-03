import clone from 'clone'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Node } from './../UniverseTypes/Node'

export function mergeTrees(...trees: Node[]): Node {
    const mergedTree: Node = new Node('')
    trees.forEach((tree, i) => mergeNode(mergedTree, tree, i))
    return mergedTree
}

function mergeNode(mergedTree: Node, node: Node, treeIndex: UniverseIndex) {
    const mergedChild = mergedTree.get(node.name)

    if (!mergedChild) {
        const nodeToMerge = cloneNode(node)
        setOccursInRecursive(nodeToMerge, treeIndex, node)
        mergedTree.push(nodeToMerge)
    } else {
        mergedChild.occursIn.set(treeIndex, node)
        node.children.forEach((ownChild) => mergeNode(mergedChild, ownChild, treeIndex))
    }
}

// Note: We could just use the `clone` method directly, but this also copies all
// the parents of the node. So, for better performance, we temporarily detach
// the parent during cloning.
function cloneNode(node: Node): Node {
    const parent = node.parent
    node.parent = undefined
    const cloned = clone(node)
    node.parent = parent
    return cloned
}

function setOccursInRecursive(node: Node, index: UniverseIndex, original: Node): void {
    node.occursIn = new Map([[index, original]])
    // The `setOccursInRecursive` function is only called from the `mergeNode`
    // function above. Because the `node` is a cloned version of the `original`,
    // we know that every child that exists in the `node` also exists on the
    // corresponding node in the `original` tree.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    node.children.forEach((child) => setOccursInRecursive(child, index, original.get(child.name)!))
}
