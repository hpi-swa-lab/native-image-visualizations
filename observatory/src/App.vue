<script setup lang="ts">
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import { SwappableComponentType } from './ts/enums/SwappableComponentType'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { globalConfigStore } from './ts/stores'

const store = globalConfigStore()
</script>

<template>
    <Venn v-if="store.currentComponent === SwappableComponentType.VennSets"></Venn>
    <SankeyTree
        v-else-if="store.currentComponent === SwappableComponentType.SankeyTree"
    ></SankeyTree>
    <TreeLine v-else-if="store.currentComponent === SwappableComponentType.TreeLine"></TreeLine>
    <CausalityGraph
        v-else-if="store.currentComponent === SwappableComponentType.CausalityGraph"
    ></CausalityGraph>
    <Home v-else-if="store.currentComponent === SwappableComponentType.Home"></Home>
</template>
