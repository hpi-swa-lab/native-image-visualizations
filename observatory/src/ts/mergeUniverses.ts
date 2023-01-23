import MergedNodeWithSizes from './SharedInterfaces/MergedNodeWithSizes'
import Node, { NodeType } from './SharedInterfaces/Node'
import NodeWithSize from './SharedInterfaces/NodeWithSize'
import { UniverseCombination, UniverseName } from './SharedTypes/Universe'
import { NumberOfBytes } from './SharedTypes/utils'
import './utils'

type TemporaryMergedNode = Node & {
    sizes: Map<UniverseName, NumberOfBytes>
    children: TemporaryMergedNode[]
}

/// Merges multiple universes containing sizes into a single tree hierarchy
/// where each node has a `sizes` attribute containing the size in the
/// respective tree.
export function mergeUniverses(universes: Map<UniverseName, NodeWithSize>): MergedNodeWithSizes {
    const mergedChildren: TemporaryMergedNode[] = []
    universes.forEach((universe, name) => {
        _mergeTreeIntoChildren(universe, name, mergedChildren, Object.keys(universes))
    })
    const root = mergedChildren[0] // There's only the single root child.
    return _addMoreSizeInformation(root, Array.from(universes.keys()))
}

function _mergeTreeIntoChildren(
    treeToMerge: NodeWithSize,
    treeOrigin: UniverseName,
    mergedChildren: TemporaryMergedNode[],
    allUniverses: UniverseName[]
) {
    let mergedChild = mergedChildren.find((child) => child.name === treeToMerge.name)
    if (!mergedChild) {
        mergedChild = {
            ...treeToMerge,
            sizes: _defaultSizes(allUniverses),
            children: []
        }
        mergedChildren.push(mergedChild)
    }
    mergedChild.sizes.set(treeOrigin, treeToMerge.size)
    for (const child of treeToMerge.children) {
        _mergeTreeIntoChildren(child, treeOrigin, mergedChild.children, allUniverses)
    }
}

function _defaultSizes(universes: UniverseName[]): Map<UniverseName, NumberOfBytes> {
    const sizes = new Map()
    for (const name of Object.keys(universes)) {
        sizes.set(name, 0)
    }
    return sizes
}

function _addMoreSizeInformation(
    tree: TemporaryMergedNode,
    universeNames: UniverseName[]
): MergedNodeWithSizes {
    let exclusiveSizes: Map<UniverseCombination, number> = new Map()
    let children: MergedNodeWithSizes[] = []

    if (tree.type == NodeType.Method) {
        const combination: string[] = []
        for (const name of universeNames) {
            if (tree.sizes.get(name)! > 0) {
                combination.push(name)
            }
        }

        exclusiveSizes.set(combination.join(','), 1) // TODO: Method size hardcoded to 1.
    } else {
        children = tree.children.map((child: TemporaryMergedNode) =>
            _addMoreSizeInformation(child, universeNames)
        )

        for (const child of children) {
            child.exclusiveSizes.forEach((size, combination) => {
                if (!exclusiveSizes.get(combination)) exclusiveSizes.set(combination, 0)
                exclusiveSizes.set(combination, exclusiveSizes.get(combination)! + size)
            })
        }
    }
    return {
        ...tree,
        children: children,
        exclusiveSizes: exclusiveSizes,
        unionedSize: Array.from(exclusiveSizes.values()).reduce((a, b) => a + b, 0)
    }
}

export function _sortAlphabetically(tree: Node) {
    tree.children.forEach(_sortAlphabetically)
    tree.children.sort((a, b) => a.name.localeCompare(b.name))
}
