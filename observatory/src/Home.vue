<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
import { VisualizationType } from './ts/SharedTypes/visualizationType'

const vt = VisualizationType.None
</script>

<template>
    <MainLayout title="Home" :visualization-type="vt">
        <template #controls></template>
    </MainLayout>
</template>
