<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
import MainLayout from '../layouts/MainLayout.vue'

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)

const container = ref<HTMLDivElement>()
let visualization: TreeLine | undefined = undefined

onMounted(() => {
    visualization = new TreeLine(
        // We know this is never null because an element with the corresponding
        // `ref` exists below and this code is executed after mounting.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        container.value!,
        new Map([
            [0, '#1b9e77'],
            [1, '#72286f']
        ])
    )
    visualization.setMultiverse(multiverse.value as Multiverse)
})

watch(multiverse, (newMultiverse) => {
    // Mount is executed first, so visualization is set.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    visualization!.setMultiverse(newMultiverse as Multiverse)
})
</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
