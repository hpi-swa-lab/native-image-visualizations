<script setup lang="ts">
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { globalConfigStore } from '../../ts/configStore'

const store = globalConfigStore()

function applyComponent(event: Event) {
    const currentComponent = parseInt((event.target as HTMLSelectElement).value)
    store.componentChanged(currentComponent)
}
</script>

<template>
    <div>
        <label for="visualization-dropdown" class="block mb-2 text-sm font-medium"
            >Choose Visualization:</label
        >
        <select
            id="visualization-dropdown"
            name="Visualization"
            :value="store.currentComponent"
            class="dropdown dropdown-white block w-full"
            @change="applyComponent"
        >
            <option :value="VisualizationType.None" disabled>Choose Visualization</option>
            <option :value="VisualizationType.VennSets">Venn Sets</option>
            <option :value="VisualizationType.SankeyTree">Sankey Tree</option>
            <option :value="VisualizationType.TreeLine">Tree Line</option>
            <option :value="VisualizationType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
