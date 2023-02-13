import { reactive } from 'vue'
import { VisualizationType } from './enums/VisualizationType'
import { Universe } from './UniverseTypes/Universe'

export const store = reactive({
    data: {},
    selections: {},
    config: {
        global: {
            currentComponent: VisualizationType.None,
            search: ''
        },
        venn: {},
        sankeyTree: {},
        treeLine: {},
        causalityGraph: {}
    },
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
