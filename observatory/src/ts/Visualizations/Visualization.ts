import { ColorScheme } from '../SharedTypes/Colors'
import { Filter } from '../SharedTypes/Filters'

/**
 * Side Notes:
 *
 * - You are expected to get the initial data and colorScheme via the constructor.
 *   This cannot be modelled with interfaces.
 * - You are also expected to do the visualization setup in the constructor.
 * - The selection and highlight always contain identifiers of the nodes of the merged multiverse.
 */
export interface Visualization {
    colorScheme: ColorScheme
    selection: Set<string>
    highlights: Set<string>
    filters: Filter[]

    setSelection(selection: Set<string>): void
    setHighlights(highlights: Set<string>): void
    setFilters(filters: Filter[]): void
}
