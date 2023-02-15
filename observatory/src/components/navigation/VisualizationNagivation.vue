<script setup lang="ts">
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { globalConfigStore } from '../../ts/stores'
import { ref } from 'vue'

const store = globalConfigStore()

const selectedOption = ref(store.currentComponent)

function applyComponent(event: Event) {
    const currentComponent = selectedOption
    store.switchToComponent(currentComponent)
}
</script>

<template>
    <div>
        <label for="visualization-dropdown" class="block mb-2 text-sm font-medium"
            >Choose Visualization:</label
        >
        <select
            id="visualization-dropdown"
            v-model="selectedOption"
            name="Visualization"
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
