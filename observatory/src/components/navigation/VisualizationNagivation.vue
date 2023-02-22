<script setup lang="ts">
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { globalConfigStore } from '../../ts/stores'

const store = globalConfigStore()

function applyComponent(event: Event) {
    const currentComponent = parseInt((event.target as HTMLSelectElement).value)
    store.switchToComponent(currentComponent)
}
</script>

<template>
    <div>
        <label for="visualization-dropdown" class="block">Visualization:</label>
        <select
            id="visualization-dropdown"
            name="Visualization"
            :value="store.currentComponent"
            class="dropdown dropdown-white block w-full"
            @change="applyComponent"
        >
            <option :value="SwappableComponentType.Home" disabled>Choose Visualization</option>
            <option :value="SwappableComponentType.VennSets">Venn Sets</option>
            <option :value="SwappableComponentType.SankeyTree">Sankey Tree</option>
            <option :value="SwappableComponentType.TreeLine">Tree Line</option>
            <option :value="SwappableComponentType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
