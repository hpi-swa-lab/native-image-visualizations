import { Node } from '../UniverseTypes/Node'

export type Filter = (node: Node) => boolean

export function filterEqual(one: Filter, another: Filter): boolean {
    // Comparison validity https://stackoverflow.com/a/9817699
    return '' + one == '' + another
}
