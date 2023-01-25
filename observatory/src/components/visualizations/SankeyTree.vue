<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.SankeyTree

const emit = defineEmits<{
    (e: 'change-viz', value: number): void
}>()

function handleChangeViz(value: number) {
    console.log('sankey', value, typeof value)
    emit('change-viz', value)
}
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="vt" @change-viz="handleChangeViz">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
