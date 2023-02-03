import { Node } from '../UniverseTypes/Node'

/**
 * Side Notes:
 *
 * - You are expected to get the initial data via the constructor.
 *   This cannot be modelled with interfaces.
 * - You are also expected to do the visualization setup in the constructor.
 * - The selection and highlight always contain nodes of the merged multiverse.
 */
export interface Visualization {
    /**
     * Accepts a merged tree where each node references the corresponding trees
     * in the original universes.
     */
    setMultiverse(multiverse: Node): void

    selection: Node[]
    setSelection(selection: Node[]): void

    setHighlights(highlights: Node[]): void
}
