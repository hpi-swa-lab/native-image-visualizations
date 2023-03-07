<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { UniverseIndex } from '../../ts/SharedTypes/Indices'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Node } from '../../ts/UniverseTypes/Node'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
import MainLayout from '../layouts/MainLayout.vue'

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)
const colorScheme = computed(() => store.colorScheme)
const highlights = computed(() => store.highlights)

const container = ref<HTMLDivElement>()
let visualization: TreeLine

onMounted(() => {
    visualization = new TreeLine(
        // We know this is never null because an element with the corresponding
        // `ref` exists below and this code is executed after mounting.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        container.value!,
        colorScheme.value
    )
    visualization.setMultiverse(multiverse.value as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    visualization.setMultiverse(newMultiverse as Multiverse)
})

watch(colorScheme, (newColorScheme) => {
    visualization.setColorScheme(newColorScheme as ColorScheme)
})

watch(highlights, (newHighlights) => {
    console.log('Highlighting');
    const highlightsByIndex: Map<UniverseIndex, Set<Node>> = new Map(Object.entries(newHighlights)
        .map(([name, highlightedNodes]) => {
            const index = multiverse.value.sources.findIndex(universe => universe.name == name)
            return [index, new Set(highlightedNodes)]
        }));

    console.log('Highlighting in multiverse');
    let highlightsInMultiverse = [] as Node[]
    function collectHighlights(mergedNode: Node) {
        const shouldBeHighlighted = Array.from(mergedNode.sources.entries())
            .find(([index, node]) => highlightsByIndex.get(index)!.has(node))
        if (shouldBeHighlighted) {
            highlightsInMultiverse.push(mergedNode)
        }
        mergedNode.children.forEach(collectHighlights);
    }
    collectHighlights((multiverse.value as Multiverse).root);

    console.log('Setting highlights');
    visualization.setHighlights(highlightsInMultiverse)
}, {deep: true})
</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
