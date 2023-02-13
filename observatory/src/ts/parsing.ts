import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'

export function createConfigSelections(
    selections: Record<string, Node[]>
): Record<string, Record<string, unknown>> {
    const result = {}

    Object.keys(selections).forEach((name: string) => {
        result['name'] = createConfigSelectionForSelection(name, selections[name])
    })

    return result
}

function createConfigSelectionForSelection(name: string, nodes: Node[]): Record<string, unknown> {
    // TODO: implement this
    return {}
}

export function createConfigData(universes: Universe[]): Record<string, Record<string, unknown>> {
    const result = {}

    universes.forEach((universe) => {
        result[universe.name] = createConfigDataForUniverse(universe)
    })

    return result
}

function createConfigDataForUniverse(universe: Universe): Record<string, unknown> {
    // TODO: implement this
    return {}
}
