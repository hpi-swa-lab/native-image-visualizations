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
    /* root.children.forEach((child: Node) => {
        result = result.concat(findNodesWithName(name, child))
    })

    return result*/
}

export function getNodesOnLevel(level: number, root: Node): Node[] {
    if (!root) return []
    if (level === 0) return [root]

    return root.children.reduce(
        (currentArray, child) => currentArray.concat(getNodesOnLevel(child, level - 1)),
        []
    )
    /* let nodes: Node[] = []
    for (const child of root.children) {
        nodes = nodes.concat(getNodesOnLevel(child, level - 1))
    }
    return nodes*/
}
