<script setup lang="ts">
import { ref } from 'vue'
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { VisualizationType } from './ts/enums/VisualizationType'
import { Universe } from './ts/UniverseTypes/Universe'
import { Node } from './ts/UniverseTypes/Node'
import { createConfigData, createConfigSelections } from './ts/parsing'

const props = withDefaults(
    defineProps<{
        currentComponent: number
        search: string
    }>(),
    {
        currentComponent: VisualizationType.None,
        search: ''
    }
)

const search = ref<string>(props.search)
const universes = ref<Universe[]>([])
const selections = ref<Record<string, Node[]>>({})

const currentVisualization = ref<number>(props.currentComponent)

const vennConfig = ref<Record<string, unknown>>({})
const snakeyTreeConfig = ref<Record<string, unknown>>({})
const treeLineConfig = ref<Record<string, unknown>>({})
const causalityGraphConfig = ref<Record<string, unknown>>({})

function exportConfig() {
    const exportData: Record<string, Record<string, unknown>> = {
        data: createConfigData(universes.value as Universe[]),
        selections: createConfigSelections(selections.value),
        config: {
            global: {
                currentComponent: currentVisualization.value,
                search: search.value
            },
            venn: vennConfig.value,
            sankeyTree: snakeyTreeConfig.value,
            treeLine: treeLineConfig.value,
            causalityGraph: causalityGraphConfig.value
        }
    }

    const dataString = `data:text/json;charset=utf-8, ${encodeURIComponent(
        JSON.stringify(exportData)
    )}`

    const anchor = document.createElement('a')
    anchor.setAttribute('href', dataString)
    anchor.setAttribute('download', 'dataAndConfig.json')

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
}

const handleChangeViz = (value: number) => {
    currentVisualization.value = value
}
</script>

<template>
    <Venn
        v-if="currentVisualization === VisualizationType.VennSets"
        @change-viz="handleChangeViz"
        @export-config="exportConfig"
    ></Venn>
    <SankeyTree
        v-else-if="currentVisualization === VisualizationType.SankeyTree"
        @change-viz="handleChangeViz"
        @export-config="exportConfig"
    ></SankeyTree>
    <TreeLine
        v-else-if="currentVisualization === VisualizationType.TreeLine"
        @change-viz="handleChangeViz"
        @export-config="exportConfig"
    ></TreeLine>
    <CausalityGraph
        v-else-if="currentVisualization === VisualizationType.CausalityGraph"
        @change-viz="handleChangeViz"
        @export-config="exportConfig"
    ></CausalityGraph>
    <Home v-else @change-viz="handleChangeViz" @export-config="exportConfig"></Home>
</template>
