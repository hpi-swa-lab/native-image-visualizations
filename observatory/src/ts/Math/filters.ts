import { Node } from '../UniverseTypes/Node'

export function findNodesWithName(name: string, root: Node): Node[] {
    const result: Node[] = []

    if (root.name.toLowerCase().includes(name.toLowerCase())) {
        result.push(root)
    }

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(findNodesWithName(name, child)),
        result
    )
}

export function findNodesWithIdentifier(identifier: string, root: Node): Node[] {
    const result: Node[] = []

    if (root.identifier.toLowerCase().includes(identifier.toLowerCase())) {
        result.push(root)
    }

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(findNodesWithIdentifier(identifier, child)),
        result
    )
}

export function getNodesOnLevel(level: number, root: Node): Node[] {
    if (level < 0) return []
    if (level === 0) return [root]

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(getNodesOnLevel(level - 1, child)),
        [] as Node[]
    )
}
