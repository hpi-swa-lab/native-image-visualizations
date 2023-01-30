<script setup lang="ts">
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        selected: VisualizationType
    }>(),
    {
        selected: VisualizationType.None
    }
)

defineEmits([EventType.CHANGE_VIZ])
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
            @change="$emit(EventType.CHANGE_VIZ, parseInt(($event.target as HTMLSelectElement).value))"
        >
            <option :value="VisualizationType.None" disabled>Choose Visualization</option>
            <option :value="VisualizationType.VennSets">Venn Sets</option>
            <option :value="VisualizationType.SankeyTree">Sankey Tree</option>
            <option :value="VisualizationType.TreeLine">Tree Line</option>
            <option :value="VisualizationType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
