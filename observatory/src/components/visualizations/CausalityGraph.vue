<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'

defineExpose({ VisualizationType })
</script>

<template>
    <MainLayout title="WIP: Causality Graph" :visualization-type="VisualizationType.CausalityGraph">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
