<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'

defineExpose({ VisualizationType })
</script>

<template>
    <MainLayout title="Tree Line" :visualization-type="VisualizationType.TreeLine">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
