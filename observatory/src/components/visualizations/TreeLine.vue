<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Layers } from '../../ts/enums/Layers'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
import MainLayout from '../layouts/MainLayout.vue'

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)
const colorScheme = computed(() => store.colorScheme)
const layer = computed(() => store.currentLayer)

const container = ref<HTMLDivElement>()
let visualization: TreeLine

onMounted(() => {
    visualization = new TreeLine(
        // We know this is never null because an element with the corresponding
        // `ref` exists below and this code is executed after mounting.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        container.value!,
        // We always have a layer.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        layer.value!,
        // We always have a color scheme.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        colorScheme.value!
    )
    visualization.setMultiverse(multiverse.value as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    visualization.setMultiverse(newMultiverse as Multiverse)
})
watch(layer, (newLayer) => {
    visualization.setLayer(newLayer as Layers)
})
watch(colorScheme, (newColorScheme) => {
    visualization.setColorScheme(newColorScheme as ColorScheme)
})
</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
