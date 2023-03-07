import { Filter } from '../SharedTypes/Filters'
import { Node } from '../UniverseTypes/Node'

export function applyFilters(filters: Filter[], root: Node): Node[] {
    const result: Node[] = []

    if (filters.every((filter) => filter(root))) {
        result.push(root)
    }

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(applyFilters(filters, child)),
        result
    )
}

export function findNodesWithName(name: string, root: Node): Node[] {
    return applyFilters(
        [(node: Node) => node.name.toLowerCase().includes(name.toLowerCase())],
        root
    )
}

export function findNodesWithIdentifier(identifier: string, root: Node): Node[] {
    return applyFilters(
        [(node: Node) => node.identifier.toLowerCase().includes(identifier.toLowerCase())],
        root
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
