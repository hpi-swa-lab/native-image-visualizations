<script lang="ts">
import { defineComponent, ref } from 'vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import { VisualizationType } from './ts/SharedTypes/visualizationType'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import Home from './Home.vue'

export default defineComponent({
    components: {
        CausalityGraph,
        TreeLine,
        SankeyTree,
        Venn,
        Home
    },
    data() {
        return {
            vennSets: VisualizationType.VennSets,
            sankeyTree: VisualizationType.SankeyTree,
            treeLine: VisualizationType.TreeLine,
            causalityGraph: VisualizationType.CausalityGraph
        }
    },
    setup() {
        const currentVisualization = ref<number>()

        const handleChangeViz = (value: number) => {
            currentVisualization.value = value
        }
        return { currentVisualization, handleChangeViz }
    }
})
</script>

<template>
    <Venn v-if="currentVisualization === vennSets" @change-viz="handleChangeViz"></Venn>
    <SankeyTree
        v-else-if="currentVisualization === sankeyTree"
        @change-viz="handleChangeViz"
    ></SankeyTree>
    <TreeLine
        v-else-if="currentVisualization === treeLine"
        @change-viz="handleChangeViz"
    ></TreeLine>
    <CausalityGraph
        v-else-if="currentVisualization === causalityGraph"
        @change-viz="handleChangeViz"
    ></CausalityGraph>
    <Home v-else @change-viz="handleChangeViz"></Home>
</template>
