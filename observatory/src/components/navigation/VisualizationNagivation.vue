<script lang="ts">
import { defineComponent } from 'vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { Emit } from '../../ts/enums/Emit'

export default defineComponent({
    props: {
        selected: {
            type: Number,
            default: VisualizationType.None
        }
    },
    emits: [Emit.CHANGE_VIZ],
    data() {
        return {
            VisualizationType,
            Emit
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
            @change="$emit(Emit.CHANGE_VIZ, parseInt($event.target.value))"
        >
            <option :value="VisualizationType.None" disabled>Choose Visualization</option>
            <option :value="VisualizationType.VennSets">Venn Sets</option>
            <option :value="VisualizationType.SankeyTree">Sankey Tree</option>
            <option :value="VisualizationType.TreeLine">Tree Line</option>
            <option :value="VisualizationType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
