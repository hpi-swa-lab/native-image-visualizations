<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'

defineExpose({ VisualizationType })
</script>

<template>
    <MainLayout title="Venn Sets" :visualization-type="VisualizationType.VennSets">
        <div id="container" />
    </MainLayout>
</template>
