import {
    MergedNodeWithSizes,
    Node,
    NodeType,
    NodeWithSize,
    NumberOfBytes,
    UniverseName
} from './data'
import './utils'

/// Parses the content of a `used_methods_...` file into a tree. Ignores
/// generated classes and their children.
// TODO: Use the common function after Luc's PR is merged.
export function parseUsedMethods(usedMethods: string): Node {
    const tree: Node = { name: '', type: NodeType.Package, children: [] }

    for (const row of usedMethods.split('\n')) {
        if (row == '' || row.includes('$$')) continue

        let current = tree
        let type = NodeType.Package
        for (const pathSegment of row.split(/[.$]/)) {
            if (pathSegment.charAt(0).isUpperCase()) {
                type = NodeType.Class
            } else if (type == NodeType.Class) {
                type = NodeType.Method
            }
            let child = current.children.find((child) => child.name === pathSegment)
            if (!child) {
                child = { name: pathSegment, type: type, children: [] }
                current.children.push(child)
            }
            current = child
        }
    }
    return tree
}

/// Adds a `size` attribute in each node that corresponds to the total size of
/// that subtree including its children. For now, we just assume that each
/// method has a size of 1.
// TODO: Save the actual method size.
export function withSizes(tree: Node): NodeWithSize {
    if (tree.children.length == 0) {
        return {
            ...tree,
            children: [],
            size: 1
        }
    } else {
        const mappedChildren = tree.children.map((child) => withSizes(child))
        return {
            ...tree,
            children: mappedChildren,
            size: mappedChildren.reduce((sizeSoFar, child) => sizeSoFar + child.size, 0)
        }
    }
}

type TemporaryMergedNode = Node & {
    sizes: Map<UniverseName, NumberOfBytes>
    children: TemporaryMergedNode[]
}

/// Merges multiple universes containing sizes into a single tree hierarchy
/// where each node has a `sizes` attribute containing the size in the
/// respective tree.
export function mergeUniverses(universes: Map<UniverseName, NodeWithSize>): MergedNodeWithSizes {
    const mergedChildren: TemporaryMergedNode[] = []
    for (const [name, universe] of Object.entries(universes)) {
        mergeTreeIntoChildren(universe, name, mergedChildren, Object.keys(universes))
    }
    const root = mergedChildren[0] // There's only the single root child.
    return withMoreSizeInformation(root, Object.keys(universes))
}

function mergeTreeIntoChildren(
    treeToMerge: NodeWithSize,
    treeOrigin: UniverseName,
    mergedChildren: TemporaryMergedNode[],
    allUniverses: UniverseName[]
) {
    let mergedChild = mergedChildren.find((child) => child.name === treeToMerge.name)
    if (!mergedChild) {
        mergedChild = {
            ...treeToMerge,
            sizes: defaultSizes(allUniverses),
            children: []
        }
        mergedChildren.push(mergedChild)
    }
    mergedChild.sizes.set(treeOrigin, treeToMerge.size)
    for (const child of treeToMerge.children) {
        mergeTreeIntoChildren(child, treeOrigin, mergedChild.children, allUniverses)
    }
}

function defaultSizes(universes: UniverseName[]): Map<UniverseName, NumberOfBytes> {
    const sizes = new Map()
    for (const name of Object.keys(universes)) {
        sizes.set(name, 0)
    }
    return sizes
}

function withMoreSizeInformation(
    tree: TemporaryMergedNode,
    universeNames: UniverseName[]
): MergedNodeWithSizes {
    let exclusiveSizes = new Map()
    let children: MergedNodeWithSizes[] = []

    if (tree.children.length == 0) {
        const combination: string[] = []
        for (const name of universeNames) {
            if (tree.sizes.get(name) > 0) {
                combination.push(name)
            }
        }

        exclusiveSizes.set(combination, 1) // TODO: Method size hardcoded to 1.
    } else {
        children = tree.children.map((child: TemporaryMergedNode) =>
            withMoreSizeInformation(child, universeNames)
        )

        for (const child of children) {
            for (const combination of Object.keys(child.exclusiveSizes)) {
                if (!exclusiveSizes.get(combination)) exclusiveSizes.set(combination, 0)
                exclusiveSizes.set(
                    combination,
                    exclusiveSizes.get(combination) + child.exclusiveSizes.get(combination)
                )
            }
        }
    }
    return {
        ...tree,
        children: children,
        exclusiveSizes: exclusiveSizes,
        unionedSize: Object.values(exclusiveSizes).reduce((a, b) => a + b, 0)
    }
}

export function sortAlphabetically(tree: Node) {
    tree.children.forEach(sortAlphabetically)
    tree.children.sort((a, b) => a.name.localeCompare(b.name))
}

