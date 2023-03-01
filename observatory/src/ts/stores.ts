import { defineStore } from 'pinia'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { createConfigUniverses, createConfigSelections, createConfigHighlights } from './parsing'
import { SwappableComponentType, componentName } from './enums/SwappableComponentType'
import { findNodesWithName } from './Math/filters'
import { SortingOption, SortingOrder } from './enums/Sorting'
import { Layers } from './enums/Layers'
import { NodesDiffingFilter, NodesFilter, NodesSortingFilter } from './SharedTypes/NodesFilter'
import { Multiverse } from './UniverseTypes/Multiverse'
import { ColorScheme } from './SharedTypes/Colors'

// Reason: Vite does not support commonJS out of box. In the vite.config, the commonjs plugin
// transpiles the cjs to ts, but the transpilation and mapping happens during run time.
// Thus, the system cannot find a declaration file for the module statically.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindConfig from '../../tailwind.config.cjs'
import resolveConfig from 'tailwindcss/resolveConfig'
const cssConfig = resolveConfig(tailwindConfig)

export const globalConfigStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            observedUniverses: [] as Universe[],
            multiverse: new Multiverse([]),
            selections: {} as Record<string, Node[]>,
            currentLayer: Layers.PACKAGES,
            highlights: {} as Record<string, Node[]>,
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
            }
        },
        updateUniverseName(oldName: string, newName: string): void {
            const universe = this.universes.find((universe) => universe.name === oldName)
            if (universe) {
                universe.name = newName
            }
        },
        toggleUniverseByName(universeName: string): void {
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
        setSelection(universeName: string, selection: Node[]): void {
            this.selections[universeName] = selection
        },
        switchToLayer(newLayer: Layers): void {
            this.currentLayer = newLayer
        },
        setHighlights(universeName: string, highlight: Node[]): void {
            this.highlights[universeName] = highlight
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
