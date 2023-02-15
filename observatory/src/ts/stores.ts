import { defineStore } from 'pinia'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { createConfigUniverses, createConfigSelections } from './parsing'
import { SwappableComponentType, componentName } from './enums/SwappableComponentType'
import { findNodesWithName } from './Math/filters'
import { SortingOption, SortingOrder } from './enums/Sorting'
import { NodesFilter } from './SharedTypes/NodesFilter'

export const globalConfigStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            selections: {} as Record<string, Node[]>,
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
                this.setSelection(universe.name, findNodesWithName(this.search, universe.root))
            })
        },
        toExportDict(): Record<
            string,
            Record<string, Record<string, unknown>> | SwappableComponentType | string
        > {
            return {
                universes: createConfigUniverses(this.universes as Universe[]),
                selections: createConfigSelections(this.selections),
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
            nodesFilter: {
                diffing: {
                    universes: new Set(['0', '1']),
                    showUnmodified: false
                },
                sorting: {
                    option: SortingOption.NAME,
                    order: SortingOrder.ASCENDING
                }
            } as NodesFilter
        }
    },
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
        },
        setSortingOption(option: string) {
            const sortingOption = Object.values(SortingOption).find(
                (item) => item.toString() === option
            )
            this.nodesFilter.sorting.option = sortingOption ? sortingOption : SortingOption.NAME
        },
        setSortingOrder(order: SortingOrder) {
            this.nodesFilter.sorting.order = order
        },
        setShowUnmodified(show: boolean) {
            this.nodesFilter.diffing.showUnmodified = show
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
