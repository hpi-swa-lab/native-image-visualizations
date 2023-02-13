<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { EventType } from '../../ts/enums/EventType'

const emit = defineEmits([EventType.EXPORT_CONFIG, EventType.CONFIG_CHANGED])
</script>

<template>
    <MainLayout
        title="Tree Line"
        :visualization-type="VisualizationType.TreeLine"
        @export-config="emit(EventType.EXPORT_CONFIG)"
    >
        <div id="container" />
    </MainLayout>
</template>
