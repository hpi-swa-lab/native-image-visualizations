<template>
    <MainLayout title="VennSets" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.VennSets
</script>
