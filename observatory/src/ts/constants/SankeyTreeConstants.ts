import { SortingOption, SortingOrder } from '../enums/Sorting'
import { NodesFilter } from '../SharedTypes/NodesFilter'
import COLORS from './ColorPalette';

export const UNMODIFIED = 'UNMODIFIED'

export const COLOR_MODIFIED = COLORS.blue
export const COLOR_UNMODIFIED = COLORS.gray

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
