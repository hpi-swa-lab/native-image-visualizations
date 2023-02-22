<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { TreeLine } from '../../ts/Visualizations/TreeLine'
import MainLayout from '../layouts/MainLayout.vue'

const store = globalConfigStore()
const multiverse = new Multiverse(store.universes as Universe[])
const container = ref<HTMLDivElement>()

onMounted(() => {
    const visualization: TreeLine = new TreeLine(
        // We know this is never null because an element with the corresponding
        // `ref` exists below and this code is executed after mounting.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        container.value!,
        new Map([
            [0, '#1b9e77'],
            [1, '#72286f']
        ])
    )
    visualization.setMultiverse(multiverse)
})
</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>
