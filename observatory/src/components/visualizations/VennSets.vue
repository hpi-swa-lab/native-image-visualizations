<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { EventType } from '../../ts/enums/EventType'
import { onMounted, ref, watch, computed } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import { VennSets } from '../../ts/Visualizations/VennSets'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import ToolTip from '../controls/ToolTip.vue'

const emit = defineEmits([EventType.CHANGE])
const store = globalConfigStore()

const tooltipContent = ref<string>('')
const tooltipShow = ref<boolean>(false)
const tooltipX = ref<number>(0)
const tooltipY = ref<number>(0)

const multiverse = computed(() => store.multiverse)
const currentLayer = computed(() => store.currentLayer)
const highlights = computed(() => store.highlights)
const selection = computed(() => store.selections)

let visualization: VennSets

function showToolTip(content: string) {
    tooltipContent.value = content;
    tooltipShow.value = true;
}

function updateToolTipPosition(x: number, y: number) {
    tooltipX.value = x
    tooltipY.value = y
}

function hideToolTip() {
    tooltipShow.value = false
}


// The reason for using as <...> is that the store saves Proxy Types of the objects

onMounted(() => {
    visualization = new VennSets('#viz-container', store.currentLayer, store.colorScheme, {showToolTip, updateToolTipPosition, hideToolTip})
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
        <ToolTip ref="tooltip" :show="tooltipShow" :content="tooltipContent" :x="tooltipX" :y="tooltipY"></ToolTip>
        <div id="viz-container" ref="container" class="w-full h-full"></div>
    </MainLayout>
</template>
