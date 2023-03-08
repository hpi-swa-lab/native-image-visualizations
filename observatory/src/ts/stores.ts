import { defineStore } from 'pinia'
import resolveConfig from 'tailwindcss/resolveConfig'
import { Layers } from './enums/Layers'
import { Filter } from './SharedTypes/Filters'
import { SortingOption, SortingOrder } from './enums/Sorting'
import { componentName, SwappableComponentType } from './enums/SwappableComponentType'
import { findNodesWithIdentifier } from './Math/filters'
import { createConfigHighlights, createConfigSelections, createConfigUniverses } from './parsing'
import { ColorScheme } from './SharedTypes/Colors'
import { NodesDiffingFilter, NodesFilter, NodesSortingFilter } from './SharedTypes/NodesFilter'
import { Multiverse } from './UniverseTypes/Multiverse'
import { Node } from './UniverseTypes/Node'
import { Universe } from './UniverseTypes/Universe'
// Reason: Vite does not support commonJS out of box. In the vite.config, the commonjs plugin
// transpiles the cjs to ts, but the transpilation and mapping happens during run time.
// Thus, the system cannot find a declaration file for the module statically.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindConfig from '../../tailwind.config.cjs'

const cssConfig = resolveConfig(tailwindConfig)

export const globalConfigStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            observedUniverses: [] as Universe[],
            multiverse: new Multiverse([]),
            selections: new Set<string>(),
            highlights: new Set<string>(),
            filters: [
                new Filter('Java Native Interface', (node: Node) => node.isJni),
                new Filter('Synthetic', (node: Node) => node.isSynthetic),
                new Filter('Reflective', (node: Node) => node.isReflective)
            ],
            activeFilters: [] as Filter[],
            currentLayer: Layers.PACKAGES,
            currentComponent: SwappableComponentType.Home as SwappableComponentType,
            previousComponent: undefined as SwappableComponentType | undefined,
            // Reason: Since our schemes are custom added, they're not part of the type declaration
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colorScheme: Object.values((cssConfig as any).theme.colors.TABLEAU_10) as ColorScheme,
            search: ''
        }
    },
    getters: {
        currentComponentName: (state) => componentName(state.currentComponent),
        previousComponentName: (state) => componentName(state.previousComponent)
    },
    actions: {
        addUniverse(newUniverse: Universe): void {
            const matchingUniverse = this.universes.find(
                (universe) => universe.name === newUniverse.name
            )
            if (matchingUniverse) {
                const matches = this.universes.filter((universe) =>
                    universe.name.match(`${newUniverse.name}(\s\([0-9]+\))?`)
                )
                newUniverse.name = newUniverse.name + ` (${matches.length})`
            }

            this.universes.push(newUniverse)
        },
        removeUniverse(universeName: string): void {
            const matchingUniverse = this.universes.find(
                (universe) => universe.name === universeName
            )

            if (matchingUniverse) {
                this.universes.splice(this.universes.indexOf(matchingUniverse), 1)
                this.toggleObservationByName(matchingUniverse.name)
            }
        },
        updateUniverseName(oldName: string, newName: string): void {
            const universe = this.universes.find((universe) => universe.name === oldName)
            if (universe) {
                universe.name = newName
            }
        },
        toggleObservationByName(universeName: string): void {
            const matchingUniverse = this.observedUniverses.find(
                (universe) => universe.name === universeName
            )

            if (matchingUniverse) {
                this.observedUniverses.splice(this.observedUniverses.indexOf(matchingUniverse), 1)
            } else {
                const universe = this.universes.find((universe) => universe.name === universeName)
                if (universe) {
                    this.observedUniverses.push(universe)
                }
            }

            this.multiverse = new Multiverse(this.observedUniverses as Universe[])
        },
        setSelection(selections: Set<string>): void {
            this.selections = selections
        },
        switchToLayer(newLayer: Layers): void {
            this.currentLayer = newLayer
        },
        setHighlights(highlights: Set<string>): void {
            this.highlights = highlights
        },
        switchColorScheme(newScheme: ColorScheme): void {
            this.colorScheme = newScheme
        },
        switchToComponent(newComponent: SwappableComponentType): void {
            this.previousComponent = this.currentComponent
            this.currentComponent = newComponent
        },
        goToPreviousComponent(): void {
            if (this.previousComponent) {
                this.switchToComponent(this.previousComponent)
            }
        },
        changeSearch(newSearch: string): void {
            this.search = newSearch

            if (newSearch.length === 0) {
                // todo there needs to be a nothing set value
                this.setHighlights(new Set())
                return
            }

            this.setHighlights(
                new Set<string>(
                    findNodesWithIdentifier(this.search, this.multiverse.root as Node).map(
                        (node: Node) => node.identifier
                    )
                )
            )
        },
        addFilter(filter: Filter): void {
            this.filters.push(filter)
        },
        removeFilter(filter: Filter): void {
            const matchingFilter = this.filters.find((existing) => existing.equals(filter))
            if (!matchingFilter) return
            this.filters.splice(this.filters.indexOf(matchingFilter), 1)
        },
        hasFilter(filter: Filter): boolean {
            return this.filters.find((existing) => existing.equals(filter)) != undefined
        },
        isFilterActive(filter: Filter, appliesComplement = false): boolean {
            if (appliesComplement) {
                return (
                    this.activeFilters.find(
                        (existing) => existing.equals(filter) && existing.applyComplement
                    ) != undefined
                )
            } else {
                return (
                    this.activeFilters.find(
                        (existing) => existing.equals(filter) && !existing.applyComplement
                    ) != undefined
                )
            }
        },
        toggleFilter(filter: Filter, appliesComplement = false): void {
            const matchingActiveFilter = this.activeFilters.find((active) => active.equals(filter))

            if (matchingActiveFilter) {
                this.activeFilters.splice(this.activeFilters.indexOf(matchingActiveFilter), 1)
                if (appliesComplement != matchingActiveFilter.applyComplement) {
                    matchingActiveFilter.applyComplement = appliesComplement
                    this.activeFilters.push(matchingActiveFilter)
                }
            } else {
                const matchingFilter = this.filters.find((existing) => existing.equals(filter))
                if (matchingFilter) {
                    matchingFilter.applyComplement = appliesComplement
                    this.activeFilters.push(matchingFilter)
                }
            }
        },
        toExportDict(): Record<string, unknown> {
            return {
                universes: createConfigUniverses(this.universes as Universe[]),
                selections: createConfigSelections(this.selections),
                highlights: createConfigHighlights(this.highlights),
                currentComponent: this.currentComponent,
                search: this.search
            }
        }
    }
})

export const vennConfigStore = defineStore('vennConfig', {
    state: () => {
        return {
            sortingOrder: SortingOrder.NONE
        }
    },
    getters: {
        isSortingOrder: (state) => (option: string) => option === state.sortingOrder
    },
    actions: {
        toExportDict(): Record<string, unknown> {
            return {
                sortingOrder: this.sortingOrder
            }
        },
        setSortingOrder(order: SortingOrder) {
            this.sortingOrder = order
        }
    }
})

export const sankeyTreeConfigStore = defineStore('sankeyTreeConfig', {
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
        toExportDict(): Record<string, unknown> {
            return {}
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

export const treeLineConfigStore = defineStore('treeLineConfig', {
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
        }
    }
})

export const causalityGraphConfigStore = defineStore('causalityGraphConfig', {
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
        }
    }
})
