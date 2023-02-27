import { defineStore } from 'pinia'
import { Universe } from '../UniverseTypes/Universe'
import { Node } from '../UniverseTypes/Node'
import {
    SwappableComponentType,
    componentName,
    componentForExport
} from '../enums/SwappableComponentType'
import { findNodesWithName } from '../Math/filters'
import { Layers } from '../enums/Layers'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { objectMap } from '../helpers'
import { Leaf } from '../UniverseTypes/Leaf'
import { InitKind, initKindForExport } from '../enums/InitKind'

type NodeIdentifiersPerUniverse = Record<string, string[]>
type NodeExport = Record<string, string | string[] | number | Record<string, string> | boolean>
type UniverseExport = Record<string, string | NodeExport[]>

export type GlobalConfig = Record<string, string | NodeIdentifiersPerUniverse | UniverseExport[]>

export const useGlobalStore = defineStore('globalConfig', {
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
                universes: universesForExport(this.universes as Universe[]),
                selections: objectMap<string[]>(this.selections, (_, selection: Node[]) => {
                    return selection.map((node: Node) => node.identifier)
                }),
                highlights: objectMap<string[]>(this.highlights, (_, highlight: Node[]) => {
                    return highlight.map((node: Node) => node.identifier)
                }),
                currentComponent: componentForExport(this.currentComponent),
                search: this.search
            }
        }
    }
})

function universesForExport(universes: Universe[]): UniverseExport[] {
    return universes.map((universe: Universe) => ({
        name: universe.name,
        root: universe.root.identifier,
        nodes: nodeListForExport(universe.root)
    }))
}

function nodeListForExport(root: Node): NodeExport[] {
    let result: NodeExport[] = []

    const tmp: NodeExport = {
        name: root.name,
        parent: root.parent ? root.parent.identifier : '',
        children: root.children.map((child: Node) => child.identifier),
        codeSize: root.codeSize,
        sources: objectMap(root.sources, (_, sourceNode: Node) => sourceNode.identifier)
    }
    if (root instanceof Leaf) {
        tmp['reflective'] = root.isReflective
        tmp['jni'] = root.isJni
        tmp['synthetic'] = root.isSynthetic
        tmp['initKinds'] = root.initKinds.map((initKind: InitKind) => initKindForExport(initKind))
    }
    result.push(tmp)

    root.children.forEach((child: Node) => {
        result = result.concat(nodeListForExport(child))
    })

    return result
}
