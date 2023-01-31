import { UniverseIndex } from '../SharedTypes/Indexes'
import { Node } from './../UniverseTypes/Node'

export function mergeTrees(...trees: Node[]): Node {
    const mergedTree: Node = new Node('')

    for (let i = 0; i < trees.length; i++) {
        mergeNode(mergedTree, trees[i], i)
    }

    // mergedTree.occurencesIn = []
    return mergedTree
}

function mergeNode(mergedTree: Node, node: Node, treeIndex: UniverseIndex) {
    let found = false
    for (const mergedChild of mergedTree.children) {
        if (mergedChild.name !== node.name) continue
        found = true
        mergedChild.occurencesIn.push(treeIndex)
        for (const ownChild of node.children) {
            mergeNode(mergedChild, ownChild, treeIndex)
        }
        break
    }

    if (!found) {
        setOccurencesInRecursive(node, treeIndex)
        mergedTree.push(node)
    }
}

function setOccurencesInRecursive(node: Node, value: UniverseIndex): void {
    node.occurencesIn = [value]
    node.children.forEach((child) => setOccurencesInRecursive(child, value))
}
