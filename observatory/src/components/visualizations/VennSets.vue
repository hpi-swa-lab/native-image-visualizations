<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'
import { onMounted, reactive, watch, computed, toRaw } from 'vue'
import { useVennStore } from '../../ts/stores/vennStore'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { VennSets } from '../../ts/Visualizations/VennSets'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import VennControls from '../controls/VennControls.vue'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'
import { SortingOrder } from '../../ts/enums/Sorting'
import { Filter } from '../../ts/SharedTypes/Filters'

const emit = defineEmits([EventType.CHANGE])
const globalStore = useGlobalStore()
const vennStore = useVennStore()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => globalStore.multiverse)
const currentLayer = computed(() => globalStore.currentLayer)
const highlights = computed(() => globalStore.highlights)
const selection = computed(() => globalStore.selections)
const activeFilters = computed(() => globalStore.activeFilters)

const sortingOrder = computed(() => vennStore.sortingOrder)

let visualization: VennSets

// The reason for using as <...> is that the store saves Proxy Types of the objects

onMounted(async () => {
    visualization = new VennSets(
        '#viz-container',
        toRaw(globalStore.currentLayer),
        toRaw(globalStore.colorScheme),
        tooltipModel,
        toRaw(vennStore.sortingOrder),
        toRaw(globalStore.highlights),
        globalStore.selections,
        toRaw(globalStore.activeFilters)
    )

    document.body.classList.toggle('loadingIcon', true)
    await new Promise((r) => setTimeout(r, 1))
    visualization.setMultiverse(toRaw(globalStore.multiverse) as Multiverse)
    document.body.classList.toggle('loadingIcon', false)
})

watch(multiverse, async (newMultiverse) => {
    document.body.classList.toggle('loadingIcon', true)
    await new Promise((r) => setTimeout(r, 1))
    visualization.setMultiverse(toRaw(newMultiverse) as Multiverse)
    document.body.classList.toggle('loadingIcon', false)
})
watch(currentLayer, async (newLayer) => {
    document.body.classList.toggle('loadingIcon', true)
    await new Promise((r) => setTimeout(r, 1))
    visualization.setLayer(toRaw(newLayer))
    document.body.classList.toggle('loadingIcon', false)
})
watch(
    highlights,
    (newHighlights) => {
        visualization.setHighlights(toRaw(newHighlights) as Set<string>)
    },
    { deep: true }
)
watch(
    selection,
    (newSelection) => {
        visualization.setSelection(newSelection as Set<string>)
    },
    { deep: true }
)
watch(
    activeFilters,
    async (newFilters) => {
        document.body.classList.toggle('loadingIcon', true)
        await new Promise((r) => setTimeout(r, 1))
        visualization.setFilters(toRaw(newFilters) as Filter[])
        document.body.classList.toggle('loadingIcon', false)
    },
    { deep: true }
)
watch(sortingOrder, (newOrder) => {
    visualization.sort(toRaw(newOrder))
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

        <div id="viz-container" ref="container" class="min-w-full h-full"></div>
    </MainLayout>
</template>
