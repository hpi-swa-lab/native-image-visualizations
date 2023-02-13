import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'

export function createConfigSelections(
    selections: Record<string, Node[]>
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    Object.keys(selections).forEach((name: string) => {
        const currentSelection: Node[] = selections[name]
        result[name] = createConfigSelectionForSelection(name, currentSelection)
    })

    return result
}

function createConfigSelectionForSelection(name: string, nodes: Node[]): Record<string, unknown> {
    // TODO: implement this
    return {}
}

export function createConfigData(universes: Universe[]): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    universes.forEach((universe) => {
        result[universe.name] = createConfigDataForUniverse(universe)
    })

    return result
}

function createConfigDataForUniverse(universe: Universe): Record<string, unknown> {
    // TODO: implement this
    return {}
}
