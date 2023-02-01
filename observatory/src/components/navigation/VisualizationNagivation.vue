<script setup lang="ts">
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        selected: SwappableComponentType
    }>(),
    {
        selected: SwappableComponentType.None
    }
)

defineEmits([EventType.CHANGE_PAGE])
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
            @change="
                $emit(EventType.CHANGE_PAGE, parseInt(($event.target as HTMLSelectElement).value))
            "
        >
            <option :value="SwappableComponentType.None" disabled>Choose Visualization</option>
            <option :value="SwappableComponentType.VennSets">Venn Sets</option>
            <option :value="SwappableComponentType.SankeyTree">Sankey Tree</option>
            <option :value="SwappableComponentType.TreeLine">Tree Line</option>
            <option :value="SwappableComponentType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
