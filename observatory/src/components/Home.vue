<script setup lang="ts">
import MainLayout from './MainLayout.vue'
import { VisualizationType } from '../ts/enums/VisualizationType'
import { EventType } from '../ts/enums/EventType'

const emit = defineEmits([EventType.EXPORT_CONFIG])
</script>

<template>
    <MainLayout
        title="Home"
        :visualization-type="VisualizationType.None"
        @export-config="emit(EventType.EXPORT_CONFIG)"
    ></MainLayout>
</template>
