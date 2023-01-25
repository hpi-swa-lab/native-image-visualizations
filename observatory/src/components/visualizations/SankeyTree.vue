<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.SankeyTree
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
