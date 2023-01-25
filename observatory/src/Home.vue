<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
import {VisualizationType} from "./ts/SharedTypes/visualizationType";

const vt = VisualizationType.None

const emit = defineEmits<{
  (e: 'change-viz', value: number): void
}>()

function handleChangeViz(value: number) {
  console.log('sankey', value, typeof value)
  emit('change-viz', value)
}
</script>

<template>
    <MainLayout title="Home" :visualization-type="vt" @change-viz="handleChangeViz">
        <template #controls></template>
    </MainLayout>
</template>
