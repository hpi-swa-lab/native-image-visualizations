const clone = require('clone')
import { UniverseIndex } from '../SharedTypes/Indices'
import { Node } from './../UniverseTypes/Node'

export function mergeTrees(...trees: Node[]): Node {
    const mergedTree: Node = new Node('')
    trees.forEach((tree, i) => mergeNode(mergedTree, tree, i))
    return mergedTree
}

function mergeNode(mergedTree: Node, node: Node, treeIndex: UniverseIndex) {
    const matchingChild = mergedTree.children.find((mergedChild) => mergedChild.name === node.name)

    if (!matchingChild) {
        const nodeToMerge = cloneNode(node)
        setOccursInRecursive(nodeToMerge, treeIndex)
        mergedTree.push(nodeToMerge)
    } else {
        matchingChild.occursIn.set(treeIndex, node)
        node.children.forEach((ownChild) => mergeNode(matchingChild, ownChild, treeIndex))
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

function setOccursInRecursive(node: Node, index: UniverseIndex): void {
    node.occursIn = new Map([[index, node]])
    node.children.forEach((child) => setOccursInRecursive(child, index))
}
