<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'
import { onMounted, reactive, watch, computed } from 'vue'
import { globalConfigStore, vennConfigStore } from '../../ts/stores'
import { VennSets } from '../../ts/Visualizations/VennSets'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import VennControls from '../controls/VennControls.vue'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'
import { SortingOrder } from '../../ts/enums/Sorting'

const emit = defineEmits([EventType.CHANGE])
const globalStore = globalConfigStore()
const vennStore = vennConfigStore()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => globalStore.multiverse)
const currentLayer = computed(() => globalStore.currentLayer)
const highlights = computed(() => globalStore.highlights)
const selection = computed(() => globalStore.selections)

const sortingOrder = computed(() => vennStore.sortingOrder)

let visualization: VennSets

// The reason for using as <...> is that the store saves Proxy Types of the objects

onMounted(() => {
    visualization = new VennSets(
        '#viz-container',
        globalStore.currentLayer,
        globalStore.colorScheme,
        tooltipModel,
        vennStore.sortingOrder
    )
    visualization.setMultiverse(globalStore.multiverse as Multiverse)
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
        visualization.setHighlights(Object.values(newHighlights).flat() as Node[])
    },
    { deep: true }
)
watch(
    selection,
    (newSelection) => {
        visualization.setSelection(Object.values(newSelection).flat() as Node[])
    },
    { deep: true }
)
watch(sortingOrder, (newOrder) => {
    visualization.sort(newOrder)
})
</script>

<template>
    <MainLayout
        title="Venn Sets"
        :component-type="SwappableComponentType.VennSets"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE, componentType)"
    >
        <Tooltip :data-model="tooltipModel"></Tooltip>
        <template #controls>
            <VennControls
                @ascending="visualization.sort(SortingOrder.ASCENDING)"
                @descending="visualization.sort(SortingOrder.DESCENDING)"
            ></VennControls>
        </template>
        <div id="container" />

        <div id="viz-container" ref="container" class="w-full h-full"></div>
    </MainLayout>
</template>
