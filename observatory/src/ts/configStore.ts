import { reactive } from 'vue'
import { VisualizationType } from './enums/VisualizationType'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { Config } from './SharedTypes/Config'
import { createConfigData, createConfigSelections } from './parsing'

export interface Store {
    universes: Universe[]
    selections: Record<string, Node[]>
    globalConfig: Config
    vennConfig: Config
    sankeyTreeConfig: Config
    treeLineConfig: Config
    causalityGraphConfig: Config

    universesChanged(newUniverses: Universe[]): void
    setSelection(universeName: string, selection: Node[]): void
    selectionsChanged(newSelections: Record<string, Node[]>): void
    componentChanged(newComponent: VisualizationType): void
    searchChange(newSearch: string): void
    setVisualizationConfig(visualization: VisualizationType, name: string, value: unknown): void
    toExportString(): string
}

export const store: Store = reactive({
    universes: [] as Universe[],
    selections: {} as Record<string, Node[]>,
    globalConfig: {
        currentComponent: VisualizationType.None,
        search: ''
    } as Config,
    vennConfig: {} as Config,
    sankeyTreeConfig: {} as Config,
    treeLineConfig: {} as Config,
    causalityGraphConfig: {} as Config,

    universesChanged(newUniverses: Universe[]): void {
        this.universes = newUniverses
    },
    setSelection(universeName: string, selection: Node[]): void {
        this.selections[universeName] = selection
    },
    selectionsChanged(newSelections: Record<string, Node[]>): void {
        this.selections = newSelections
    },
    componentChanged(newComponent: VisualizationType): void {
        this.globalConfig.currentComponent = newComponent
    },
    searchChange(newSearch: string): void {
        this.globalConfig.search = newSearch
    },
    setVisualizationConfig(visualization: VisualizationType, name: string, value: unknown): void {
        if (visualization === VisualizationType.VennSets) {
            this.vennConfig[name] = value
        } else if (visualization === VisualizationType.SankeyTree) {
            this.sankeyTreeConfig[name] = value
        } else if (visualization === VisualizationType.TreeLine) {
            this.treeLineConfig[name] = value
        } else if (visualization === VisualizationType.CausalityGraph) {
            this.causalityGraphConfig[name] = value
        }
    },
    toExportString(): string {
        const result: Record<string, Universe[] | Node[] | Config> = {}

        result['universes'] = createConfigData(this.universes)
        result['selections'] = createConfigSelections(this.selections)
        result['globalConfig'] = this.globalConfig
        result['vennConfig'] = this.vennConfig
        result['sankeyTreeConfig'] = this.sankeyTreeConfig
        result['treeLineConfig'] = this.treeLineConfig
        result['causalityGraphConfig'] = this.causalityGraphConfig

        return JSON.stringify(result)
    }
})
