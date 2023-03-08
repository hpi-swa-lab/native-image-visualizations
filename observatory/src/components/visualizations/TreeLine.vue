<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { formatBytes } from '../../ts/SharedTypes/Size'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import { universeCombinationAsIndices } from '../../ts/UniverseTypes/UniverseCombination'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import { SizeInfo, TreeLine } from '../../ts/Visualizations/TreeLine'
import Tooltip from '../controls/Tooltip.vue'
import MainLayout from '../layouts/MainLayout.vue'

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)
const colorScheme = computed(() => store.colorScheme)
const highlights = computed(() => store.highlights)

const tooltip = reactive(new TooltipModel())

const container = ref<HTMLDivElement>()
let visualization: TreeLine

onMounted(() => {
    // We know this is never null because an element with the corresponding
    // `ref` exists below and this code is executed after mounting.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const theContainer = container.value!

    visualization = new TreeLine(theContainer, colorScheme.value)
    visualization.setMultiverse(multiverse.value as Multiverse)

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
    visualization.setMultiverse(newMultiverse as Multiverse)
})
watch(colorScheme, (newColorScheme) => {
    visualization.setColorScheme(newColorScheme as ColorScheme)
})
watch(
    highlights,
    (newHighlights) => {
        visualization.setHighlights(newHighlights as Set<string>)
    },
    { deep: true }
)
</script>

<template>
    <MainLayout title="Tree Line">
        <Tooltip :data-model="tooltip"></Tooltip>
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
