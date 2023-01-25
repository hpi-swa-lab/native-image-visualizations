<script lang="ts">
import { defineComponent } from 'vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

export default defineComponent({
    props: {
        selected: Number
    },
    data() {
        return {
            vennSets: VisualizationType.VennSets,
            sankeyTree: VisualizationType.SankeyTree,
            treeLine: VisualizationType.TreeLine,
            causalityGraph: VisualizationType.CausalityGraph,
            none: VisualizationType.None
        }
    }
})
</script>

<template>
    <div>
        <label for="visualization-dropdown" class="block mb-2 text-sm font-medium"
            >Choose Visualization:</label
        >
        <select
            id="visualization-dropdown"
            name="Visualization"
            :value="selected"
            class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            @change="$emit('change-viz', parseInt($event.target.value))"
        >
            <option :value="none" disabled>Choose Visualization</option>
            <option :value="vennSets">Venn</option>
            <option :value="sankeyTree">Sankey Tree</option>
            <option :value="treeLine">Tree Line</option>
            <option :value="causalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
