<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ColorScheme } from '../../ts/SharedTypes/Colors'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
import MainLayout from '../layouts/MainLayout.vue'
import { Filter } from '../../ts/SharedTypes/Filters'

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)
const colorScheme = computed(() => store.colorScheme)
const filters = computed(() => store.filters)

const container = ref<HTMLDivElement>()
let visualization: TreeLine

onMounted(() => {
    visualization = new TreeLine(
        // We know this is never null because an element with the corresponding
        // `ref` exists below and this code is executed after mounting.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        container.value!,
        colorScheme.value,
        store.filters
    )
    visualization.setMultiverse(multiverse.value as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    visualization.setMultiverse(newMultiverse as Multiverse)
})

watch(colorScheme, (newColorScheme) => {
    visualization.setColorScheme(newColorScheme as ColorScheme)
})

watch(
    filters,
    (newFilters) => {
        visualization.setFilters(newFilters as Filter[])
    },
    { deep: true }
)
</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
