<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'
import { onMounted, ref, watch, computed } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import { VennSets } from '../../ts/Visualizations/VennSets'

const emit = defineEmits([EventType.CHANGE])
const store = globalConfigStore()

const container = ref<HTMLDivElement>()

const multiverse = computed(() => store.multiverse)
const currentLayer = computed(() => store.currentLayer)
const highlights = computed(() => store.highlights)
const selection = computed(() => store.selections)

let visualization: VennSets


onMounted(() => {
    visualization = new VennSets('#viz-container', store.currentLayer)
    visualization.setMultiverse(store.multiverse as any)
})


watch(
    multiverse, (newMultiverse) => {visualization.setMultiverse(newMultiverse as any)}
)
watch (currentLayer, (newLayer) => {visualization.setLayer(newLayer)})
watch (highlights, (newHighlights) => {
    visualization.setHighlights(Object.values(newHighlights)[0] as any)
})
watch (selection, (newSelection) => {
    visualization.setSelection(Object.values(newSelection)[0] as any)
})

</script>

<template>
    <MainLayout
        title="Venn Sets"
        :component-type="SwappableComponentType.VennSets"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE, componentType)"
    >
        <div id='viz-container' ref="container"  class="w-full h-full" />
    </MainLayout>
</template>
