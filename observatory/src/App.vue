<script setup lang="ts">
import { ref } from 'vue'
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import { PageType } from './ts/enums/PageType'
import DataManager from './components/DataManager.vue'

const currentPage = ref<number>(PageType.Home)
const handlePageChange = (value: number) => {
    currentPage.value = value
}
</script>

<template>
    <Venn v-if="currentPage === PageType.VennSets" @change-page="handlePageChange"></Venn>
    <SankeyTree
        v-else-if="currentPage === PageType.SankeyTree"
        @change-page="handlePageChange"
    ></SankeyTree>
    <TreeLine
        v-else-if="currentPage === PageType.TreeLine"
        @change-page="handlePageChange"
    ></TreeLine>
    <CausalityGraph
        v-else-if="currentPage === PageType.CausalityGraph"
        @change-page="handlePageChange"
    ></CausalityGraph>
    <Home v-else-if="currentPage === PageType.Home" @change-page="handlePageChange"></Home>
    <DataManager
        v-else-if="currentPage === PageType.DataManager"
        @change-page="handlePageChange"
    ></DataManager>
</template>
