<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { formatBytes } from '../../ts/SharedTypes/Size'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
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
    
    visualization = new TreeLine(
        theContainer,
        colorScheme.value
    )
    visualization.setMultiverse(multiverse.value as Multiverse)

    theContainer.addEventListener('mousemove', (event) => {
        var containerRect = theContainer.getBoundingClientRect()
        const node = visualization.getNodeAtPosition(event.x - containerRect.x, event.y - containerRect.y)
        if (!node) {
            tooltip.hide()
            return;
        }
        tooltip.updateContent(tooltipContentForNode(node))
        tooltip.updatePosition(event.pageX, event.pageY)
        tooltip.display()
    })
})

function tooltipContentForNode(node: Node): string {
    const allSources = multiverse.value.sources
    let content = `<b>Name</b>: ${node.identifier}`;
    for (const [index, source] of node.sources) {
        content += `<br><b>${allSources[index].name}</b>: ${formatBytes(source.codeSize)}`;
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
