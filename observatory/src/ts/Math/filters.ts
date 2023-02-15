import { Node } from '../UniverseTypes/Node'

export function findNodesWithName(name: string, root: Node): Node[] {
    let result: Node[] = []

    if (root.name.toLocaleLowerCase().includes(name.toLocaleLowerCase())) {
        result.push(root)
    }

    root.children.forEach((child: Node) => {
        result = result.concat(findNodesWithName(name, child))
    })

    return result
}
