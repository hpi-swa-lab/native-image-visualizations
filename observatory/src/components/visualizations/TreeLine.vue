<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.TreeLine
</script>

<template>
    <MainLayout title="Tree Line" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
