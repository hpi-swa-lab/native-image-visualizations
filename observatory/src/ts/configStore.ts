import { reactive } from 'vue'
import { VisualizationType } from './enums/VisualizationType'
import { Universe } from './UniverseTypes/Universe'
import { Config } from './SharedTypes/Config'

export interface Store {
    data: Record<string, unknown>
    selections: Record<string, unknown>
    globalConfig: Config
    vennConfig: Config
    sankeyTreeConfig: Config
    treeLineConfig: Config
    causalityGraphConfig: Config

    dataChanged(newUniverses: Universe[]): void
    selectionsChanged(newSelections: Record<string, Node[]>): void
    componentChanged(newComponent: VisualizationType): void
    searchChange(newSearch: string): void
    setVisualizationConfig(visualization: VisualizationType, name: string, value: unknown): void
}

export const store: Store = reactive({
    data: {},
    selections: {},
    globalConfig: {
        currentComponent: VisualizationType.None
    },
    vennConfig: {},
    sankeyTreeConfig: {},
    treeLineConfig: {},
    causalityGraphConfig: {},
    dataChanged(newUniverses: Universe[]) {
        this.config.data = createConfigData(newUniverses)
    },
    selectionsChanged(newSelections: Record<string, Node[]>) {
        this.config.selections = createConfigSelections(newSelections)
    },
    componentChanged(newComponent: VisualizationType) {
        this.config.global.currentComponent = newComponent
    },
    searchChange(newSearch: string) {
        this.config.global.search = newSearch
    },
    setVisualizationConfig(visualization: VisualizationType, name: string, value: unknown) {
        let config

        switch (visualization) {
            case VennSets:
                config = this.config.venn
                break
            case SankeyTree:
                config = this.config.sankeyTree
                break
            case TreeLine:
                config = this.config.treeLine
                break
            case CausalityGraph:
                config = this.config.causalityGraph
                break
            default:
                config = null
        }

        if (config) {
            config[name] = value
        }
    }
})
