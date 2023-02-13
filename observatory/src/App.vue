<script setup lang="ts">
import { ref } from 'vue'
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { VisualizationType } from './ts/enums/VisualizationType'

const currentVisualization = ref<number>()
const handleChangeViz = (value: number) => {
    currentVisualization.value = value
}

function exportConfig() {}
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
