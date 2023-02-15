<script setup lang="ts">
import { ref } from 'vue';
import { globalConfigStore } from '../../ts/stores';
import { Multiverse } from '../../ts/UniverseTypes/Multiverse';
import { TreeLine } from '../../ts/Visualizations/TreeLine';
import MainLayout from '../layouts/MainLayout.vue';

// const universes = ref<Universe[]>(props.universes)

const store = globalConfigStore()

console.log('Universes: ', store.universes)
const multiverse = new Multiverse(store.universes)

const container = ref<HTMLDivElement>()
let visualization: TreeLine = new TreeLine(
    container.value!,
    new Map([[0, '#1b9e77'], [1, '#72286f']])
)
visualization.setMultiverse(multiverse)
</script>

<template>
    <MainLayout title="Tree Line">
        <div id="container">
            <div id="tree-line-container" ref="container" class="w-full h-full" />
        </div>
    </MainLayout>
</template>