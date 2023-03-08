import { defineStore } from 'pinia'
import { Universe } from '../UniverseTypes/Universe'
import { Node } from '../UniverseTypes/Node'
import {
    SwappableComponentType,
    componentName,
    serializeComponent
} from '../enums/SwappableComponentType'
import { serializerLayer, Layers } from '../enums/Layers'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { InvalidInputError } from '../errors'
import { ColorScheme } from '../SharedTypes/Colors'
import { findNodesWithIdentifier } from '../Math/filters'

// Reason: Vite does not support commonJS out of box. In the vite.config, the commonjs plugin
// transpiles the cjs to ts, but the transpilation and mapping happens during run time.
// Thus, the system cannot find a declaration file for the module statically.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindConfig from '../../../tailwind.config.cjs'
import resolveConfig from 'tailwindcss/resolveConfig'

const cssConfig = resolveConfig(tailwindConfig)

type NodeIdentifiersPerUniverse = Record<string, string[]>

export type GlobalConfig = Record<string, string | string[] | NodeIdentifiersPerUniverse>

export const CONFIG_NAME = '_config'
export const reservedNames = [CONFIG_NAME]

function validateUniverseName(name: string) {
    if (reservedNames.includes(name)) {
        throw new InvalidInputError(`The name ${name} is reserved and cannot be used for universes`)
    }
}

export const useGlobalStore = defineStore('globalConfig', {
    state: () => {
        return {
            universes: [] as Universe[],
            rawData: {} as Record<string, unknown>,
            observedUniverses: [] as Universe[],
            multiverse: new Multiverse([]),
            selections: new Set<string>(),
            highlights: new Set<string>(),
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
        addUniverse(newUniverse: Universe, rawData: unknown): void {
            validateUniverseName(newUniverse.name)

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
                this.toggleObservationByName(matchingUniverse.name)
            }

            if (this.rawData[universeName]) {
                delete this.rawData[universeName]
            }
        },
        updateUniverseName(oldName: string, newName: string): void {
            validateUniverseName(newName)

            const universe = this.universes.find((universe) => universe.name === oldName)
            if (universe) {
                universe.name = newName
            }

            if (this.rawData[oldName]) {
                this.rawData[newName] = this.rawData[oldName]
                delete this.rawData[oldName]
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
            this.setHighlights(
                new Set<string>(
                    findNodesWithIdentifier(this.search, this.multiverse.root as Node).map(
                        (node: Node) => node.identifier
                    )
                )
            )
        },
        loadExportDict(config: GlobalConfig) {
            // TODO
        },
        toExportDict(): GlobalConfig {
            return {
                observedUniverses: (this.observedUniverses as Universe[]).map(
                    (universe: Universe) => universe.name
                ),
                selections: Array.from(this.selections),
                highlights: Array.from(this.highlights),
                currentLayer: serializerLayer(this.currentLayer),
                colorScheme: this.colorScheme,
                currentComponent: serializeComponent(this.currentComponent),
                previousComponent: this.previousComponent
                    ? serializeComponent(this.previousComponent)
                    : '',
                search: this.search
            }
        }
    }
})
