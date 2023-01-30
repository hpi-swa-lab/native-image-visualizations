<script setup lang="ts">
import { ref } from 'vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import { VisualizationType } from './ts/enums/VisualizationType'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import Home from './components/Home.vue'

const currentVisualization = ref<number>()
const handleChangeViz = (value: number) => {
    currentVisualization.value = value
}
</script>

<template>
    <Venn
        v-if="currentVisualization === VisualizationType.VennSets"
        @change-viz="handleChangeViz"
    ></Venn>
    <SankeyTree
        v-else-if="currentVisualization === VisualizationType.SankeyTree"
        @change-viz="handleChangeViz"
    ></SankeyTree>
    <TreeLine
        v-else-if="currentVisualization === VisualizationType.TreeLine"
        @change-viz="handleChangeViz"
    ></TreeLine>
    <CausalityGraph
        v-else-if="currentVisualization === VisualizationType.CausalityGraph"
        @change-viz="handleChangeViz"
    ></CausalityGraph>
    <Home v-else @change-viz="handleChangeViz"></Home>
</template>
