import { defineStore } from 'pinia'
import { SortingOption, SortingOrder } from '../enums/Sorting'
import {
    NodesDiffingFilter,
    serializeNodesDiffingFilter,
    NodesFilter,
    NodesSortingFilter,
    serializeNodesSortingFilter
} from '../SharedTypes/NodesFilter'
import {useGlobalStore} from './globalStore';

export type SankeyStoreConfig = Record<
    string,
    Record<string, boolean | string[]> | Record<string, string>
>

export const useSankeyStore = defineStore('sankeyTreeConfig', {
    state: () => {
        return {
            diffingFilter: {
                universes: new Set([0, 1]),
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
        isUniverseFiltered: (state) => (universeId: number) =>
            state.diffingFilter.universes.has(universeId),
        isFilteredSortingOption: (state) => (option: string) =>
            option === state.sortingFilter.option,
        colorModified: () => useGlobalStore().colorScheme[6],
        colorUnmodified: () => useGlobalStore().colorScheme[9]
    },
    actions: {
        toExportDict(): SankeyStoreConfig {
            return {
                diffing: serializeNodesDiffingFilter(this.diffingFilter),
                sorting: serializeNodesSortingFilter(this.sortingFilter)
            }
        },
        changeUniverseSelection(universeId: number) {
            if (this.diffingFilter.universes.has(universeId)) {
                this.diffingFilter.universes.delete(universeId)
            } else {
                this.diffingFilter.universes.add(universeId)
            }
        },
        addSelectedUniverse(universe: number) {
            this.diffingFilter.universes.add(universe)
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