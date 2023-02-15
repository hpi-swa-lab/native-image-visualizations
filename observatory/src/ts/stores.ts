import { defineStore } from 'pinia'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { createConfigData, createConfigSelections } from './parsing'
import { SwappableComponentType, componentName } from './enums/SwappableComponentType'

export const globalConfigStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            selections: {} as Record<string, Node[]>,
            currentComponent: SwappableComponentType.Home as SwappableComponentType,
            previousComponent: undefined as SwappableComponentType | undefined
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
        searchChange(newSearch: string): void {
            this.search = newSearch
        },
        toExportDict(): Record<
            string,
            Record<string, Record<string, unknown>> | SwappableComponentType
        > {
            return {
                universes: createConfigData(this.universes),
                selections: createConfigSelections(this.selections),
                currentComponent: this.currentComponent
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
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
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
