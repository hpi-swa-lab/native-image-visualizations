import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'

export function createConfigSelections(
    selections: Record<string, Node[]>
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    Object.keys(selections).forEach((name: string) => {
        result[name] = createConfigSelection(name, selections[name])
    })

    return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createConfigSelection(name: string, nodes: Node[]): Record<string, unknown> {
    // TODO: implement this, corresponding issue: [#85](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/85)
    return {}
}

export function createConfigHighlights(
    highlights: Record<string, Node[]>
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    Object.keys(highlights).forEach((name: string) => {
        result[name] = createConfigSelection(name, highlights[name])
    })

    return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createConfigHighlight(name: string, nodes: Node[]): Record<string, unknown> {
    // TODO: implement this, corresponding issue: [#85](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/85)
    return {}
}

export function createConfigUniverses(
    universes: Universe[]
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    universes.forEach((universe) => {
        result[universe.name] = createConfigUniverse(universe)
    })

    return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createConfigUniverse(universe: Universe): Record<string, unknown> {
    // TODO: implement this, corresponding issue: [#85](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/85v)
    return {}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loadJson(file: File): Promise<object> {
    // TODO: implement this, corresponding issue: [#36](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/36)
    return {}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseReachabilityExport(reachabilityExport: object): Node {
    // TODO: implement this, corresponding issue: [#36](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/36)
    return new Node('root', [], undefined, 0)
}
