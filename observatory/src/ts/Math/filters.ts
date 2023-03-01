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

export function findNodeWithIdentifier(identifier: string, root: Node): Node | undefined {
    if (root.identifier === identifier) {
        return root
    }

    return root.children
        .map((child) => findNodeWithIdentifier(identifier, child))
        .find((value: Node | undefined) => value !== undefined)
}

export function findNodesWithIdentifiers(identifiers: string[], root: Node): Node[] {
    return identifiers
        .map((identifier: string) => findNodeWithIdentifier(identifier, root))
        .filter((mapResult: Node | undefined) => mapResult !== undefined) as Node[]
}

export function getNodesOnLevel(level: number, root: Node): Node[] {
    if (level < 0) return []
    if (level === 0) return [root]

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(getNodesOnLevel(level - 1, child)),
        [] as Node[]
    )
}
