import { Node } from '../UniverseTypes/Node'

export enum Layers {
    MULTIVERSE = 0,
    MODULES = 1,
    PACKAGES = 2,
    CLASSES = 3,
    METHODS = 4
}

export function layerName(layer: Layers): string {
    return Layers[layer]
}

export function layerOfNode(node: Node): Layers {
    switch (depthOfNode(node)) {
        case 0:
            return Layers.MULTIVERSE
        case 1:
            return Layers.MODULES
        case 2:
            return Layers.PACKAGES
        case 3:
            return Layers.CLASSES
        case 4:
            return Layers.METHODS
        default:
            throw Error('Tree is too tall.')
    }
}
function depthOfNode(node: Node): number {
    return node.parent ? depthOfNode(node.parent) + 1 : 0
}
