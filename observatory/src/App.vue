<script setup lang="ts">
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { VisualizationType } from './ts/enums/VisualizationType'
import { globalConfigStore } from './ts/configStore'

const store = globalConfigStore()
</script>

<template>
    <Venn v-if="store.currentComponent === VisualizationType.VennSets"></Venn>
    <SankeyTree v-else-if="store.currentComponent === VisualizationType.SankeyTree"></SankeyTree>
    <TreeLine v-else-if="store.currentComponent === VisualizationType.TreeLine"></TreeLine>
    <CausalityGraph
        v-else-if="store.currentComponent === VisualizationType.CausalityGraph"
    ></CausalityGraph>
    <Home v-else></Home>
</template>
