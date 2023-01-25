<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.CausalityGraph
</script>

<template>
    <MainLayout title="WIP: Causality Graph" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
