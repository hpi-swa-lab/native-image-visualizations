import { defineStore } from 'pinia'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { createConfigUniverses, createConfigSelections, createConfigHighlights } from './parsing'
import { SwappableComponentType, componentName } from './enums/SwappableComponentType'
import { findNodesWithName, getNodesOnLevel } from './Math/filters'
import { SortingOption, SortingOrder } from './enums/Sorting'
import { Layers } from './enums/Layers'
import { NodesDiffingFilter, NodesFilter, NodesSortingFilter } from './SharedTypes/NodesFilter'

export const globalConfigStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            selections: {} as Record<string, Node[]>,
            currentLayer: Layers.PACKAGES,
            highlights: {} as Record<string, Node[]>,
            currentComponent: SwappableComponentType.Home as SwappableComponentType,
            previousComponent: undefined as SwappableComponentType | undefined,
            search: ''
        }
    },
    getters: {
        currentComponentName: (state) => componentName(state.currentComponent),
        previousComponentName: (state) => componentName(state.previousComponent)
    },
    actions: {
        addUniverse(newUniverse: Universe): void {
            if (this.universes.find((universe) => universe.name === newUniverse.name)) return

            this.universes.push(newUniverse)
        },
        removeUniverse(universeName: string): void {
            const matchingUniverse = this.universes.find(
                (universe) => universe.name === universeName
            )

            if (matchingUniverse) {
                this.universes.splice(this.universes.indexOf(matchingUniverse), 1)
            }
        },
        setSelection(universeName: string, selection: Node[]): void {
            this.selections[universeName] = selection
        },
        switchToLayer(newLayer: Layers): void {
            this.currentLayer = newLayer

            const universes = this.universes as Universe[]
            universes.forEach((universe: Universe) => {
                this.setSelection(universe.name, getNodesOnLevel(this.currentLayer, universe.root)))
        },
        setHighlights(universeName: string, highlight: Node[]): void {
            this.highlights[universeName] = highlight
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

            const universes = this.universes as Universe[]
            universes.forEach((universe: Universe) => {
                this.setHighlights(universe.name, findNodesWithName(this.search, universe.root))
            })
        },
        toExportDict(): Record<
            string,
            Record<string, Record<string, unknown>> | SwappableComponentType | string
        > {
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
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
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
