import { COLOR_BLUE, COLOR_GREY } from './ColorPalette'
import { SortingOption, SortingOrder } from '../enums/Sorting'
import { NodesFilter } from '../SharedTypes/NodesFilter'

export const UNMODIFIED = 'UNMODIFIED'

export const COLOR_MODIFIED = COLOR_BLUE
export const COLOR_UNMODIFIED = COLOR_GREY

export const DEFAULT_NODES_FILTER: NodesFilter = {
    diffing: {
        universes: new Set(['0', '1']),
        showUnmodified: false
    },
    sorting: {
        option: SortingOption.NAME,
        order: SortingOrder.ASCENDING
    }
}
