<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import COLORS from '../../ts/constants/ColorPalette'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
import {
    MAX_OBSERVED_UNIVERSES_FOR_SANKEY_TREE,
    SankeyTree
} from '../../ts/Visualizations/SankeyTree'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'
import AlertBox from '../controls/AlertBox.vue'

const emit = defineEmits([EventType.CHANGE])
const globalStore = useGlobalStore()
const sankeyStore = useSankeyStore()

const container = ref<HTMLDivElement>()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => globalStore.multiverse)
const currentLayer = computed(() => globalStore.currentLayer)
const highlights = computed(() => globalStore.highlights)
const selection = computed(() => globalStore.selections)
const nodesFilter = computed(() => sankeyStore.nodesFilter)

const infoText = [
    'Visualization is only displayed if exactly 1 or 2 universes to observe are selected.'
]
const displayInfo = computed(
    () =>
        multiverse.value.sources.length === 0 ||
        multiverse.value.sources.length > MAX_OBSERVED_UNIVERSES_FOR_SANKEY_TREE
)

const metadata = ref<UniverseMetadata>(
    createUniverseMetadata(globalStore.multiverse as Multiverse, globalStore.colorScheme)
)
let visualization: SankeyTree

onMounted(() => {
    visualization = new SankeyTree(
        '#viz-container',
        globalStore.currentLayer,
        globalStore.colorScheme,
        tooltipModel
    )
    visualization.setMetadata(metadata.value)
    visualization.setMultiverse(globalStore.multiverse as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    metadata.value = createUniverseMetadata(newMultiverse as Multiverse, globalStore.colorScheme)
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

        <div id="viz-container" ref="container" class="w-full h-full">
            <div v-if="displayInfo" class="flex w-full h-full">
                <AlertBox
                    title="Note"
                    :alert-infos="infoText"
                    class="w-[30%] h-fit m-auto align-middle"
                />
            </div>
        </div>
    </MainLayout>
</template>
