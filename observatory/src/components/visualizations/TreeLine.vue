<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { globalConfigStore } from '../../ts/stores';
import { Multiverse } from '../../ts/UniverseTypes/Multiverse';
import { Universe } from '../../ts/UniverseTypes/Universe';
import { TreeLine } from '../../ts/Visualizations/TreeLine';
import MainLayout from '../layouts/MainLayout.vue';

// const universes = ref<Universe[]>(props.universes)

const store = globalConfigStore()

console.log('Universes: ', store.universes)
console.log('Calculating multiverse...')
const multiverse = new Multiverse(store.universes as Universe[])

const container = ref<HTMLDivElement>()

onMounted(() => {
    let visualization: TreeLine = new TreeLine(
        container.value!,
        new Map([[0, '#1b9e77'], [1, '#72286f']])
    )
    visualization.setMultiverse(multiverse)
})

</script>

<template>
    <MainLayout title="Tree Line">
        <div ref="container" class="w-full h-full" />
    </MainLayout>
</template>