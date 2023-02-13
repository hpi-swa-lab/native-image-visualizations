<script setup lang="ts">
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { VisualizationType } from './ts/enums/VisualizationType'
import { store } from './ts/configStore'
</script>

<template>
    <Venn v-if="store.globalConfig.currentComponent === VisualizationType.VennSets"></Venn>
    <SankeyTree
        v-else-if="store.globalConfig.currentComponent === VisualizationType.SankeyTree"
    ></SankeyTree>
    <TreeLine
        v-else-if="store.globalConfig.currentComponent === VisualizationType.TreeLine"
    ></TreeLine>
    <CausalityGraph
        v-else-if="store.globalConfig.currentComponent === VisualizationType.CausalityGraph"
    ></CausalityGraph>
    <Home v-else></Home>
</template>
