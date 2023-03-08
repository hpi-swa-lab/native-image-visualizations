import { defineStore } from 'pinia'
import { SortingOption, SortingOrder } from '../enums/Sorting'
import {
    NodesDiffingFilter,
    serializeNodesDiffingFilter,
    NodesFilter,
    NodesSortingFilter,
    serializeNodesSortingFilter,
    deserializeNodesDiffingFilter,
    deserializeNodesSortingFilter
} from '../SharedTypes/NodesFilter'

export type SankeyStoreConfig = Record<
    string,
    Record<string, boolean | string[]> | Record<string, string>
>

export const useSankeyStore = defineStore('sankeyTreeConfig', {
    state: () => {
        return {
            diffingFilter: {
                universes: new Set(['0', '1']),
                showUnmodified: false
            } as NodesDiffingFilter,
            sortingFilter: {
                option: SortingOption.NAME,
                order: SortingOrder.ASCENDING
            } as NodesSortingFilter
        }
    },
    getters: {
        nodesFilter: (state) =>
            ({
                diffing: state.diffingFilter,
                sorting: state.sortingFilter
            } as NodesFilter),
        isUniverseFiltered: (state) => (universeId: string) =>
            state.diffingFilter.universes.has(universeId),
        isFilteredSortingOption: (state) => (option: string) =>
            option === state.sortingFilter.option
    },
    actions: {
        loadExportDict(config: SankeyStoreConfig) {
            if (!('diffing' in config) || !('sorting' in config)) {
                return
            }

            const diffing = deserializeNodesDiffingFilter(config['diffing'])
            if (diffing) {
                this.diffingFilter = diffing
            }

            const sorting = deserializeNodesSortingFilter(config['sorting'])
            if (sorting) {
                this.sortingFilter = sorting
            }
        },
        toExportDict(): SankeyStoreConfig {
            return {
                diffing: serializeNodesDiffingFilter(this.diffingFilter),
                sorting: serializeNodesSortingFilter(this.sortingFilter)
            }
        },
        changeUniverseSelection(universeId: string) {
            if (this.diffingFilter.universes.has(universeId)) {
                this.diffingFilter.universes.delete(universeId)
            } else {
                this.diffingFilter.universes.add(universeId)
            }
        },
        setSortingOption(option: string) {
            const sortingOption = Object.values(SortingOption).find(
                (item) => item.toString() === option
            )
            this.sortingFilter.option = sortingOption ? sortingOption : SortingOption.NAME
        },
        setSortingOrder(order: SortingOrder) {
            this.sortingFilter.order = order
        },
        setShowUnmodified(show: boolean) {
            this.diffingFilter.showUnmodified = show
        }
    }
})
