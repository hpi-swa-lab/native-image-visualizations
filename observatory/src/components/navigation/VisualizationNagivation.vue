<script lang="ts">
import { defineComponent } from 'vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'

export default defineComponent({
    props: {
        selected: {
            type: Number,
            default: -1
        }
    },
    emits: ['change-viz'],
    data() {
        return {
            VisualizationType
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
            class="dropdown dropdown-white block w-full"
            @change="$emit('change-viz', parseInt($event.target.value))"
        >
            <option :value="VisualizationType.None" disabled>Choose Visualization</option>
            <option :value="VisualizationType.VennSets">Venn Sets</option>
            <option :value="VisualizationType.SankeyTree">Sankey Tree</option>
            <option :value="VisualizationType.TreeLine">Tree Line</option>
            <option :value="VisualizationType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
