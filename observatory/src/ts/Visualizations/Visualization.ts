import { ColorScheme } from '../SharedTypes/Colors'
import { Node } from '../UniverseTypes/Node'

/**
 * Side Notes:
 *
 * - You are expected to get the initial data and colorScheme via the constructor.
 *   This cannot be modelled with interfaces.
 * - You are also expected to do the visualization setup in the constructor.
 * - The selection and highlight always contain nodes of the merged multiverse.
 */
export interface Visualization {
    colorScheme: ColorScheme
    selection: Node[]
    highlights: Node[]

    setSelection(selection: Node[]): void
    setHighlights(highlights: Node[]): void
}
