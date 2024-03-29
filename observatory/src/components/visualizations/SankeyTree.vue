<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
import {
    MAX_OBSERVED_UNIVERSES_FOR_SANKEY_TREE,
    SankeyTree
} from '../../ts/Visualizations/SankeyTree'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import Tooltip from '../controls/Tooltip.vue'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'
import AlertBox from '../controls/AlertBox.vue'
import { Filter } from '../../ts/SharedTypes/Filters'

const emit = defineEmits([EventType.CHANGE])
const globalStore = useGlobalStore()
const sankeyStore = useSankeyStore()

const container = ref<HTMLDivElement>()

const tooltipModel = reactive(new TooltipModel())

const multiverse = computed(() => globalStore.multiverse)
const currentLayer = computed(() => globalStore.currentLayer)
const highlights = computed(() => globalStore.highlights)
const selections = computed(() => globalStore.selections)
const activeFilters = computed(() => globalStore.activeFilters)
const searchTerm = computed(() => globalStore.search)
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
    createUniverseMetadata(toRaw(globalStore.multiverse) as Multiverse)
)
let visualization: SankeyTree

onMounted(async () => {
    visualization = new SankeyTree(
        '#viz-container',
        toRaw(globalStore.currentLayer),
        toRaw(globalStore.colorScheme),
        tooltipModel,
        toRaw(globalStore.highlights),
        globalStore.selections,
        toRaw(globalStore.activeFilters),
        toRaw(globalStore.search)
    )

    document.body.classList.toggle('loadingIcon', true)
    await new Promise((r) => setTimeout(r, 1))
    visualization.setMetadata(metadata.value)
    visualization.setMultiverse(toRaw(globalStore.multiverse) as Multiverse)
    document.body.classList.toggle('loadingIcon', false)
})

watch(multiverse, async (newMultiverse) => {
    document.body.classList.toggle('loadingIcon', true)
    await new Promise((r) => setTimeout(r, 1))
    metadata.value = createUniverseMetadata(toRaw(newMultiverse) as Multiverse)
    visualization.setMetadata(metadata.value)
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

watch(searchTerm, (newSearchTerm) => {
    visualization.setSearchTerm(toRaw(newSearchTerm) as string)
})

watch(
    selections,
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

watch(
    nodesFilter,
    async () => {
        document.body.classList.toggle('loadingIcon', true)
        await new Promise((r) => setTimeout(r, 1))
        visualization.handleNodesFilterChanged()
        document.body.classList.toggle('loadingIcon', false)
    },
    { deep: true }
)

function createUniverseMetadata(multiverse: Multiverse) {
    const metadata: UniverseMetadata = {}
    multiverse.sources.forEach((universe, index) => {
        metadata[index] = {
            name: universe.name,
            color: universe.color ?? 'black'
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
