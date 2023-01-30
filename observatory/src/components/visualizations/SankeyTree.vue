<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'

defineExpose({ VisualizationType })
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="VisualizationType.SankeyTree">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
