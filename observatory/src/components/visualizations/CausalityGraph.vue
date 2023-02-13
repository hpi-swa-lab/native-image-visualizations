<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { EventType } from '../../ts/enums/EventType'

const emit = defineEmits([EventType.EXPORT_CONFIG])
</script>

<template>
    <MainLayout
        title="WIP: Causality Graph"
        :visualization-type="VisualizationType.CausalityGraph"
        @export-config="emit(EventType.EXPORT_CONFIG)"
    >
        <div id="container" />
    </MainLayout>
</template>
