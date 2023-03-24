<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, toRaw } from 'vue'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { formatBytes } from '../../ts/SharedTypes/Size'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import { universeCombinationAsIndices } from '../../ts/UniverseTypes/UniverseCombination'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import { SizeInfo, TreeLine } from '../../ts/Visualizations/TreeLine'
import Tooltip from '../controls/Tooltip.vue'
import MainLayout from '../layouts/MainLayout.vue'
import { Filter } from '../../ts/SharedTypes/Filters'
import SearchBar from '../controls/SearchBar.vue';
import SelectionList from '../controls/SelectionList.vue';
import FilteringOptions from '../controls/FilteringOptions.vue';

const store = useGlobalStore()
const multiverse = computed(() => store.multiverse)
const colorScheme = computed(() => store.colorScheme)
const activeFilters = computed(() => store.activeFilters)
const highlights = computed(() => store.highlights)
const selections = computed(() => store.selections)

const tooltip = reactive(new TooltipModel())

const container = ref<HTMLDivElement>()
let visualization: TreeLine

onMounted(() => {
    // We know this is never null because an element with the corresponding
    // `ref` exists below and this code is executed after mounting.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const theContainer = container.value!

    visualization = new TreeLine(
        theContainer,
        toRaw(colorScheme.value),
        toRaw(highlights.value),
        selections.value,
        toRaw(activeFilters.value)
    )
    visualization.setMultiverse(toRaw(multiverse.value) as Multiverse)

    theContainer.addEventListener('mousemove', (event) => {
        const containerRect = theContainer.getBoundingClientRect()
        const info = visualization.getInfoAtPosition(
            event.x - containerRect.x,
            event.y - containerRect.y
        )
        if (!info) {
            tooltip.hide()
            return
        }
        tooltip.updateContent(tooltipContentForInfo(info))
        tooltip.updatePosition(event.pageX, event.pageY)
        tooltip.display()
    })
    theContainer.addEventListener('mouseout', () => {
        tooltip.hide()
    })
    theContainer.addEventListener('click', (event) => {
        const containerRect = theContainer.getBoundingClientRect()
        const info = visualization.getInfoAtPosition(
            event.x - containerRect.x,
            event.y - containerRect.y
        )
        if (!info || !(info instanceof Node)) return

        selections.value.has(info.identifier)
            ? selections.value.delete(info.identifier)
            : selections.value.add(info.identifier)
    })
})

function tooltipContentForInfo(info: SizeInfo | Node): string {
    return info instanceof Node ? tooltipContentForNode(info) : tooltipContentForSizeInfo(info)
}
function tooltipContentForSizeInfo(info: SizeInfo): string {
    const allSources = multiverse.value.sources
    let content = `${formatBytes(info.size)}`

    const indices = universeCombinationAsIndices(info.sources)
    if (indices.length == 1) {
        content += ` exclusively in ${allSources[indices[0]].name}`
    } else {
        content += ` shared among ${indices.map((index) => allSources[index].name).join(', ')}`
    }

    return content
}
function tooltipContentForNode(node: Node): string {
    const allSources = multiverse.value.sources
    let content = `<b>Name</b>: ${node.identifier}`

    for (const [index, source] of node.sources) {
        content += `<br><b>${allSources[index].name}</b>: ${formatBytes(source.codeSize)}`
    }

    return content
}

watch(multiverse, (newMultiverse) => {
    visualization.setMultiverse(toRaw(newMultiverse) as Multiverse)
})
watch(colorScheme, (newColorScheme) => {
    visualization.setColorScheme(toRaw(newColorScheme) as ColorScheme)
})

watch(
    activeFilters,
    (newFilters) => {
        visualization.setFilters(toRaw(newFilters) as Filter[])
    },
    { deep: true }
)
watch(
    highlights,
    (newHighlights) => {
        visualization.setHighlights(toRaw(newHighlights) as Set<string>)
    },
    { deep: true }
)
watch(
    selections,
    (newSelection) => {
        visualization.setSelection(newSelection as Set<string>)
    },
    { deep: true }
)
</script>

<template>
    <MainLayout title="Tree Line">
        <template #controls>
            <div class="input-container settings-container space-y-4">
                <SearchBar />
                <SelectionList />
                <FilteringOptions />
            </div>
        </template>
        <Tooltip :data-model="tooltip"></Tooltip>
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
