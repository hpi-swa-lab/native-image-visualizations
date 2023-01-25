<template>
    <MainLayout title="Hierarchy Bubbles" :visualization-type="vt" @change-viz="handleChangeViz">
        <template #controls>
            <label for="" />
            <input ref="inputBuildReport" type="file" accept=".txt" />
            <button class="btn btn-primary" @click="startSimulation">Start</button>
        </template>

        <div id="hierarchy-bubbles-container" ref="container" class="w-full h-full" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '../MainLayout.vue'
import HierarchyBubbles from '../../ts/Visualizations/HierarchyBubbles'
import {
    loadBuildReport,
    parseBuildReportToNodeWithSizeHierarchy
} from '../../ts/BuildReportsParser'
import { removeChildren } from '../../ts/utils'
import HierarchyNodeWithSize from '../../ts/SharedInterfaces/HierarchyNodeWithSize'
import { VisualizationType } from '../../ts/SharedTypes/visualizationType'

const vt = VisualizationType.HierarchyBubbles

const emit = defineEmits<{
    (e: 'change-viz', value: number): void
}>()

function handleChangeViz(value: number) {
    console.log('sankey', value, typeof value)
    emit('change-viz', value)
}

const inputBuildReport = ref<HTMLInputElement>()
const container = ref<HTMLDivElement>()

let data: HierarchyNodeWithSize | undefined
let visualization: HierarchyBubbles | undefined

async function startSimulation() {
    const inputElement = inputBuildReport.value

    if (inputElement && inputElement.files && inputElement.files[0]) {
        const rawData = await loadBuildReport(inputElement.files[0])
        data = parseBuildReportToNodeWithSizeHierarchy(rawData)
    }

    if (!data) return

    if (container.value !== undefined) {
        removeChildren(container.value)
    }

    if (!visualization) {
        visualization = new HierarchyBubbles(data)
        visualization.generate()
    }

    visualization?.continueSimulation()
}
</script>
