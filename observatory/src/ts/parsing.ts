import { Node } from './UniverseTypes/Node'

export async function loadJson(file: File): Promise<object> {
    return {}
}

export function parseReachabilityExport(reachabilityExport: object): Node {
    return new Node('root', undefined, [], 0)
}
