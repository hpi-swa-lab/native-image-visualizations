export enum Layers {
    MULTIVERSE = 0,
    MODULES = 1,
    PACKAGES = 2,
    CLASSES = 3,
    METHODS = 4
}

export function serializerLayer(layer: Layers): string {
    return layer.toString()
}

export function deserializeLayer(value: string): Layers | undefined {
    const layerValue = parseInt(value)

    if (!layerValue || !Number.isInteger(layerValue) || layerValue < 0 || layerValue > 4) {
        return undefined
    }

    return layerValue
}

export function layerName(layer: Layers): string {
    return Layers[layer]
}
