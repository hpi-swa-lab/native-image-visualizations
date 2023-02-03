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
    setUniverses(universes: Universe[]): void

    selection: Node[]
    setSelection(selection: Node[]): void

    setHighlights(highlights: Node[]): void
}
