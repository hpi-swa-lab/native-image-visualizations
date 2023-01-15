<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import HierarchyBubbles from '../ts/Visualizations/HierarchyBubbles'
import { loadBuildReport, parseBuildReportToNodeWithSizeHierarchy } from '../ts/BuildReportsParser'
import { removeChildren } from '../ts/utils'
import HierarchyNodeWithSize from '../ts/SharedInterfaces/HierarchyNodeWithSize'

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

<template>
    <MainLayout>
        <template #controls>
            <label for=""></label>
            <input ref="inputBuildReport" type="file" accept=".txt" />
            <button class="btn btn-primary" @click="startSimulation">Start</button>
        </template>

        <div ref="container" class="w-full h-full" id="hierarchy-bubbles-container"></div>
    </MainLayout>
</template>
