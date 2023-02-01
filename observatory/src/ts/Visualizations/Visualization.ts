import { Node } from '../UniverseTypes/Node'
import { Universe } from '../UniverseTypes/Universe'

/**
 * Side Notes:
 *
 * - You are expected to get the initial data via the constructor.
 *   This cannot be modelled with interfaces.
 * - You are also expected to do the visualization setup in the constructor.
 */
export interface Visualization {
    selection: Node[]
    setSelection(selection: Node[]): void
}

export interface UniverseVisualization extends Visualization {
    setUniverse(universe: Universe): void
}

export interface MultiverseVisualization extends Visualization {
    setMultiverse(multiverse: Universe[]): void
}
