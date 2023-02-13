import { reactive } from 'vue'
import { VisualizationType } from './enums/VisualizationType'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'
import { Config } from './SharedTypes/Config'
import { createConfigData, createConfigSelections } from './parsing'

export interface Store {
    data: Config
    selections: Config
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
    data: {} as Config,
    selections: {} as Config,
    globalConfig: {
        currentComponent: VisualizationType.None,
        search: ''
    } as Config,
    vennConfig: {} as Config,
    sankeyTreeConfig: {} as Config,
    treeLineConfig: {} as Config,
    causalityGraphConfig: {} as Config,

    dataChanged(newUniverses: Universe[]) {
        this.data = createConfigData(newUniverses)
    },
    selectionsChanged(newSelections: Record<string, Node[]>) {
        this.selections = createConfigSelections(newSelections)
    },
    componentChanged(newComponent: VisualizationType) {
        this.globalConfig.currentComponent = newComponent
    },
    searchChange(newSearch: string) {
        this.globalConfig.search = newSearch
    },
    setVisualizationConfig(visualization: VisualizationType, name: string, value: unknown) {
        if (visualization === VisualizationType.VennSets) {
            this.vennConfig[name] = value
        } else if (visualization === VisualizationType.SankeyTree) {
            this.sankeyTreeConfig[name] = value
        } else if (visualization === VisualizationType.TreeLine) {
            this.treeLineConfig[name] = value
        } else if (visualization === VisualizationType.CausalityGraph) {
            this.causalityGraphConfig[name] = value
        }
    }
})
