export enum Layers {
    MULTIVERS = 0,
    UNIVERSES = 1,
    MODULES = 2,
    PACKAGES = 3,
    CLASSES = 4,
    METHODS = 5
}

export function layerName(layer: Layers): string {
    return Layers[layer]
}
