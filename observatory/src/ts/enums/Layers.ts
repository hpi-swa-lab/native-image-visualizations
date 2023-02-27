export enum Layers {
    MULTIVERSE = 0,
    MODULES = 1,
    PACKAGES = 2,
    CLASSES = 3,
    METHODS = 4
}

export function layerForExport(layer: Layers): string {
    return layer.toString()
}

export function layerName(layer: Layers): string {
    return Layers[layer]
}
