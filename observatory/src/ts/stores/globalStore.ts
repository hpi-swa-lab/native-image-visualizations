import { defineStore } from 'pinia'
import { Universe } from '../UniverseTypes/Universe'
import { Node } from '../UniverseTypes/Node'
import {
    SwappableComponentType,
    componentName,
    serializeComponent,
    deserializeComponent
} from '../enums/SwappableComponentType'
import { serializerLayer, Layers, deserializeLayer } from '../enums/Layers'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { InvalidInputError } from '../errors'
import { ColorScheme } from '../SharedTypes/Colors'
import { findNodesIncludingIdentifier } from '../Math/filters'
import { toRaw } from 'vue'

// Reason: Vite does not support commonJS out of box. In the vite.config, the commonjs plugin
// transpiles the cjs to ts, but the transpilation and mapping happens during run time.
// Thus, the system cannot find a declaration file for the module statically.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindConfig from '../../../tailwind.config.cjs'
import resolveConfig from 'tailwindcss/resolveConfig'
import { Filter } from '../SharedTypes/Filters'
import { loadStringArrayParameter, loadStringParameter } from './helpers'

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
            colorScheme: Object.values((cssConfig as any).theme.colors.SET_3) as ColorScheme,
            universeColors: Object.values(
                (cssConfig as any).theme.colors.UNIVERSE_COLORS
            ) as ColorScheme,
            search: ''
        }
    },
    getters: {
        currentComponentName: (state) => componentName(state.currentComponent),
        previousComponentName: (state) => componentName(state.previousComponent),
        nextUniverseColor: (state) =>
            state.universeColors[state.universes.length % state.universeColors.length]
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
            if (!matchingUniverse) return
            this.universes.splice(this.universes.indexOf(matchingUniverse), 1)
            this.toggleObservationByName(matchingUniverse.name)
            if (!this.rawData[universeName]) return
            delete this.rawData[universeName]
        },
        updateUniverseName(oldName: string, newName: string): void {
            validateUniverseName(newName)

            const universe = this.universes.find((universe) => universe.name === oldName)
            if (!universe) return
            universe.name = newName
            if (!this.rawData[oldName]) return
            this.rawData[newName] = this.rawData[oldName]
            delete this.rawData[oldName]
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

            this.multiverse = new Multiverse(toRaw(this.observedUniverses) as Universe[])
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
        basicChangeSearchTerm(newSearch: string): void {
            this.search = newSearch
        },
        changeSearch(newSearch: string): void {
            this.search = newSearch

            if (newSearch.length === 0) {
                this.setHighlights(new Set())
                return
            }

            this.setHighlights(
                new Set<string>(
                    findNodesIncludingIdentifier(
                        toRaw(this.search),
                        toRaw(this.multiverse.root) as Node
                    ).map((node: Node) => node.identifier)
                )
            )
        },
        loadExportDict(config: GlobalConfig) {
            loadStringArrayParameter(
                'observedUniverses',
                config,
                (universeNames: string[]) =>
                    (this.universes as Universe[])
                        .map((universe: Universe) => universe.name)
                        .filter((name: string) => universeNames.includes(name)),
                (universeNames: string[]) =>
                    universeNames.forEach((name: string) => this.toggleObservationByName(name))
            )

            loadStringArrayParameter(
                'selections',
                config,
                (selections: string[]) => new Set(selections),
                (selections: Set<string>) => this.setSelection(selections)
            )

            loadStringArrayParameter(
                'highlights',
                config,
                (highlights: string[]) => new Set(highlights),
                (highlights: Set<string>) => this.setHighlights(highlights)
            )

            loadStringParameter(
                'currentLayer',
                config,
                (layerName: string) => deserializeLayer(layerName),
                (layer: Layers) => this.switchToLayer(layer)
            )

            loadStringArrayParameter(
                'colorScheme',
                config,
                (colorScheme: string[]) => colorScheme,
                (colorScheme: string[]) => this.switchColorScheme(colorScheme)
            )

            loadStringArrayParameter(
                'universeColors',
                config,
                (universeColors: string[]) => universeColors,
                (universeColors: string[]) => (this.universeColors = universeColors)
            )

            loadStringParameter(
                'currentComponent',
                config,
                (componentName: string) => deserializeComponent(componentName),
                (component: SwappableComponentType) => this.switchToComponent(component)
            )

            loadStringParameter(
                'previousComponent',
                config,
                (componentName: string) => deserializeComponent(componentName),
                (component: SwappableComponentType) => {
                    this.previousComponent = component
                }
            )

            loadStringParameter(
                'search',
                config,
                (search: string) => search,
                (search: string) => this.changeSearch(search)
            )

            loadStringArrayParameter(
                'filters',
                config,
                (filters: string[]) => filters.map((filter) => Filter.parse(filter)),
                (filters: Filter[]) => filters.forEach((filter: Filter) => this.addFilter(filter))
            )

            loadStringArrayParameter(
                'activeFilters',
                config,
                (filters: string[]) => filters.map((filter) => Filter.parse(filter)),
                // the check if the active filter is one of the existing ones
                // is already done in toggleFilter
                (filters: Filter[]) =>
                    filters.forEach((filter: Filter) => {
                        this.toggleFilter(filter)
                    })
            )
        },
        addFilter(filter: Filter): boolean {
            const matchingFilter = this.filters.find((existing) => existing.equals(filter))
            if (matchingFilter) return false
            this.filters.push(filter)
            return true
        },
        removeFilter(filter: Filter): void {
            const matchingFilter = this.filters.find((existing) => existing.equals(filter))
            if (!matchingFilter) return
            this.filters.splice(this.filters.indexOf(matchingFilter), 1)
            this.toggleFilter(matchingFilter, matchingFilter.applyComplement)
        },
        hasFilter(filter: Filter): boolean {
            return this.filters.find((existing) => existing.equals(filter)) != undefined
        },
        isFilterActive(filter: Filter, applyComplement = false): boolean {
            return (
                this.activeFilters.find(
                    (existing) =>
                        existing.equals(filter) && existing.applyComplement === applyComplement
                ) != undefined
            )
        },
        toggleFilter(filter: Filter, applyComplement = false): void {
            const matchingActiveFilter = this.activeFilters.find((active) => active.equals(filter))

            if (matchingActiveFilter) {
                this.activeFilters.splice(this.activeFilters.indexOf(matchingActiveFilter), 1)
                if (applyComplement === matchingActiveFilter.applyComplement) return
                matchingActiveFilter.applyComplement = applyComplement
                this.activeFilters.push(matchingActiveFilter)
            } else {
                const matchingFilter = this.filters.find((existing) => existing.equals(filter))
                if (!matchingFilter) return
                matchingFilter.applyComplement = applyComplement
                this.activeFilters.push(matchingFilter)
            }
        },
        toExportDict(): GlobalConfig {
            return {
                observedUniverses: (this.observedUniverses as Universe[]).map(
                    (universe: Universe) => universe.name
                ),
                filters: this.filters
                    .filter((filter) => filter.isCustom)
                    .map((filter) => filter.serialize()),
                activeFilters: this.activeFilters.map((filter) => filter.serialize()),
                selections: Array.from(this.selections),
                highlights: Array.from(this.highlights),
                currentLayer: serializerLayer(this.currentLayer),
                colorScheme: this.colorScheme,
                universeColors: this.universeColors,
                currentComponent: serializeComponent(this.currentComponent),
                previousComponent: this.previousComponent
                    ? serializeComponent(this.previousComponent)
                    : '',
                search: this.search
            }
        }
    }
})
