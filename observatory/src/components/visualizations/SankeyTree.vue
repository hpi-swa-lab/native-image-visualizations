<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="VisualizationType.SankeyTree">
        <template #controls>
            <SankeyTreeControls></SankeyTreeControls>
        </template>
        <div id="container" />
    </MainLayout>
</template>
