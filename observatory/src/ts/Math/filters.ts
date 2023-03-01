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
    const result: Node | undefined = undefined

    if (root.identifier === identifier) {
        return root
    } else {
        const childrenWithId = root.children
            .map((child) => findNodeWithIdentifier(identifier, child))
            .filter((value: Node | undefined) => value !== undefined)

        if (childrenWithId.length > 0) {
            return childrenWithId[0]
        }
    }

    return result
}

export function findNodesWithIdentifiers(identifiers: string[], root: Node): Node[] {
    const result: Node[] = []

    identifiers.forEach((identifyer: string) => {
        const node = findNodeWithIdentifier(identifyer, root)
        if (node) {
            result.push(node)
        }
    })

    return result
}

export function getNodesOnLevel(level: number, root: Node): Node[] {
    if (level < 0) return []
    if (level === 0) return [root]

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(getNodesOnLevel(level - 1, child)),
        [] as Node[]
    )
}
