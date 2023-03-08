<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import COLORS from '../../ts/constants/ColorPalette'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
import { SankeyTree } from '../../ts/Visualizations/SankeyTree'
import { globalConfigStore, sankeyTreeConfigStore } from '../../ts/stores'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'

const emit = defineEmits([EventType.CHANGE])
const store = globalConfigStore()
const sankeyStore = sankeyTreeConfigStore()

const container = ref<HTMLDivElement>()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => store.multiverse)
const currentLayer = computed(() => store.currentLayer)
const highlights = computed(() => store.highlights)
const selection = computed(() => store.selections)

const nodesFilter = computed(() => sankeyStore.nodesFilter)

const metadata = ref<UniverseMetadata>(
    createUniverseMetadata(store.multiverse as Multiverse, store.colorScheme)
)
let visualization: SankeyTree

onMounted(() => {
    // todo
    visualization = new SankeyTree(
        '#viz-container',
        store.currentLayer,
        store.colorScheme,
        tooltipModel
    )
    visualization.setMetadata(metadata.value)
    visualization.setMultiverse(store.multiverse as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    metadata.value = createUniverseMetadata(newMultiverse as Multiverse, store.colorScheme)
    visualization.setMetadata(metadata.value)
    visualization.setMultiverse(newMultiverse as Multiverse)
})
watch(currentLayer, (newLayer) => {
    visualization.setLayer(newLayer)
})
watch(
    highlights,
    (newHighlights) => {
        visualization.setHighlights(newHighlights as Set<string>)
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
    nodesFilter,
    () => {
        visualization.handleNodesFilterChanged()
    },
    { deep: true }
)

function createUniverseMetadata(multiverse: Multiverse, colorScheme: ColorScheme) {
    const metadata: UniverseMetadata = {}
    multiverse.sources.forEach((universe, index) => {
        metadata[index] = {
            name: universe.name,
            color: colorScheme[index] ?? COLORS.white
        }
        sankeyStore.addSelectedUniverse(index)
    })
    console.log('universeMetadata', metadata)
    return metadata
}
</script>

<template>
    <MainLayout
        title="Sankey Tree"
        :component-type="SwappableComponentType.SankeyTree"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE, componentType)"
    >
        <Tooltip :data-model="tooltipModel"></Tooltip>
        <template #controls>
            <SankeyTreeControls :universes-metadata="metadata"></SankeyTreeControls>
        </template>

        <div id="viz-container" ref="container" class="w-full h-full" />
    </MainLayout>
</template>
