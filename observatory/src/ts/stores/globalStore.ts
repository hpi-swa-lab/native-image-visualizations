import { defineStore } from 'pinia'
import { Universe } from '../UniverseTypes/Universe'
import { Node } from '../UniverseTypes/Node'
import {
    SwappableComponentType,
    componentName,
    componentForExport
} from '../enums/SwappableComponentType'
import { findNodesWithName } from '../Math/filters'
import { layerForExport, Layers } from '../enums/Layers'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { objectMap } from '../helpers'
import { InvalidInputError } from '../errors'

type NodeIdentifiersPerUniverse = Record<string, string[]>

export type GlobalConfig = Record<string, string | NodeIdentifiersPerUniverse | unknown>

export const CONFIG_NAME = '_config'
export const reservedNames = [CONFIG_NAME]

export const useGlobalStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            rawData: {} as Record<string, unknown>,
            observedUniverses: [] as Universe[],
            multiverse: new Multiverse([]),
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
        addUniverse(newUniverse: Universe, rawData: unknown): void {
            if (reservedNames.includes(newUniverse.name)) {
                throw new InvalidInputError(
                    `The name ${newUniverse.name} is reserved and cannot be used for universes`
                )
            }

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
            this.rawData[newUniverse.name] = rawData
        },
        removeUniverse(universeName: string): void {
            const matchingUniverse = this.universes.find(
                (universe) => universe.name === universeName
            )

            if (matchingUniverse) {
                this.universes.splice(this.universes.indexOf(matchingUniverse), 1)
            }

            if (this.rawData[universeName]) {
                delete this.rawData[universeName]
            }
        },
        updateUniverseName(oldName: string, newName: string): void {
            if (reservedNames.includes(newName)) {
                throw new InvalidInputError(
                    `The name ${newName} is reserved and cannot be used for universes`
                )
            }

            const universe = this.universes.find((universe) => universe.name === oldName)
            if (universe) {
                universe.name = newName
            }

            if (this.rawData[oldName]) {
                this.rawData[newName] = JSON.parse(JSON.stringify(this.rawData[oldName]))
                delete this.rawData[oldName]
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
        toExportDict(): GlobalConfig {
            return {
                observedUniverses: (this.observedUniverses as Universe[]).map(
                    (universe: Universe) => universe.name
                ),
                selections: objectMap<string[]>(this.selections, (_, selection: Node[]) => {
                    return selection.map((node: Node) => node.identifier)
                }),
                highlights: objectMap<string[]>(this.highlights, (_, highlight: Node[]) => {
                    return highlight.map((node: Node) => node.identifier)
                }),
                currentLayer: layerForExport(this.currentLayer),
                currentComponent: componentForExport(this.currentComponent),
                previousComponent: this.previousComponent
                    ? componentForExport(this.previousComponent)
                    : '',
                search: this.search
            }
        }
    }
})
