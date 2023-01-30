<script setup lang="ts">
import { PageType } from '../../ts/enums/PageType'
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        selected: PageType
    }>(),
    {
        selected: PageType.None
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
            <option :value="PageType.None" disabled>Choose Visualization</option>
            <option :value="PageType.VennSets">Venn Sets</option>
            <option :value="PageType.SankeyTree">Sankey Tree</option>
            <option :value="PageType.TreeLine">Tree Line</option>
            <option :value="PageType.CausalityGraph">Causality Graph</option>
        </select>
    </div>
</template>
