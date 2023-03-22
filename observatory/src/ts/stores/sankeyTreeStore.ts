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
import { UniverseIndex } from '../SharedTypes/Indices'

// Reason: Vite does not support commonJS out of box. In the vite.config, the commonjs plugin
// transpiles the cjs to ts, but the transpilation and mapping happens during run time.
// Thus, the system cannot find a declaration file for the module statically.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindConfig from '../../../tailwind.config.cjs'
import resolveConfig from 'tailwindcss/resolveConfig'

const cssConfig: any = resolveConfig(tailwindConfig)

export type SankeyStoreConfig = Record<
    string,
    Record<string, boolean | UniverseIndex[]> | Record<string, string>
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
        isUniverseFiltered: (state) => (universeId: UniverseIndex) =>
            state.diffingFilter.universes.has(universeId),
        isFilteredSortingOption: (state) => (option: string) =>
            option === state.sortingFilter.option,
        colorModified: () => cssConfig.theme.colors.MODIFIED,
        colorUnmodified: () => cssConfig.theme.colors.UNMODIFIED
    },
    actions: {
        loadExportDict(config: SankeyStoreConfig) {
            if (!('diffing' in config) || !('sorting' in config)) {
                return
            }

            const diffing = deserializeNodesDiffingFilter(config['diffing'])
            if (diffing) {
                diffing.universes.forEach((universeId: number) => {
                    this.changeUniverseSelection(universeId)
                })
                this.setShowUnmodified(diffing.showUnmodified)
            }

            const sorting = deserializeNodesSortingFilter(config['sorting'])
            if (sorting) {
                this.setSortingOrder(sorting.order)
                this.setSortingOption(sorting.option)
            }
        },
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
