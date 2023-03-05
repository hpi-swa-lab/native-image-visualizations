<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'
import { onMounted, watch, computed, reactive } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import { VennSets } from '../../ts/Visualizations/VennSets'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'

const emit = defineEmits([EventType.CHANGE])
const store = globalConfigStore()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => store.multiverse)
const currentLayer = computed(() => store.currentLayer)
const highlights = computed(() => store.highlights)
const selection = computed(() => store.selections)

let visualization: VennSets

// The reason for using as <...> is that the store saves Proxy Types of the objects

onMounted(() => {
    visualization = new VennSets(
        '#viz-container',
        store.currentLayer,
        store.colorScheme,
        tooltipModel
    )
    visualization.setMultiverse(store.multiverse as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    visualization.setMultiverse(newMultiverse as Multiverse)
})
watch(currentLayer, (newLayer) => {
    visualization.setLayer(newLayer)
})
watch(
    highlights,
    (newHighlights) => {
        visualization.setHighlights(Object.values(newHighlights)[0] as Node[])
    },
    { deep: true }
)
watch(
    selection,
    (newSelection) => {
        visualization.setSelection(Object.values(newSelection)[0] as Node[])
    },
    { deep: true }
)
</script>

<template>
    <MainLayout
        title="Venn Sets"
        :component-type="SwappableComponentType.VennSets"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE, componentType)"
    >
        <Tooltip :data-model="tooltipModel"></Tooltip>
        <div id="viz-container" ref="container" class="w-full h-full"></div>
    </MainLayout>
</template>
