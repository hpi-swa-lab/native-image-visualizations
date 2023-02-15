import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { VisualizationType } from './enums/VisualizationType'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { createConfigData, createConfigSelections } from './parsing'

export const globalConfigStore = defineStore('globalConfig', {
    state: () => ({
        _universes: [],
        _selections: {},
        _currentComponent: VisualizationType.None,
        _search: ''
    }),
    getters: {
        universes: (state) => state._universes,
        selections: (state) => state._selections,
        currentComponent: (state) => state._currentComponent,
        search: (state) => state._search
    },
    actions: {
        universesChanged(newUniverses: Universe[]): void {
            this._universes = newUniverses
        },
        setSelection(universeName: string, selection: Node[]): void {
            this._selections[universeName] = selection
        },
        selectionsChanged(newSelections: Record<string, Node[]>): void {
            this._selections = newSelections
        },
        componentChanged(newComponent: VisualizationType): void {
            this._currentComponent = newComponent
        },
        searchChange(newSearch: string): void {
            this._search = newSearch
        },
        toExportDict(): Record<string, Universe[] | Node[]> {
            return {
                universes: createConfigData(this._universes),
                selections: createConfigSelections(this._selections),
                currentComponent: this._currentComponent,
                search: this._search
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
