<script setup lang="ts">
import MainLayout from '../components/MainLayout.vue'
import HierarchyBubbles from '../ts/Visualizations/HierarchyBubbles'
import { loadBuildReport, parseBuildReportToNodeWithSizeHierarchy } from '../ts/BuildReportsParser';

async function onFileChanged(e: Event) {
    const inputElement = e.currentTarget as HTMLInputElement

    if (inputElement && inputElement.files && inputElement.files[0]) {
        const rawData = await loadBuildReport(inputElement.files[0])
        const data = parseBuildReportToNodeWithSizeHierarchy(rawData)

        const visualization = new HierarchyBubbles(data)
        visualization.generate()
    }
}

</script>

<template>
   <MainLayout>
        <template #controls >
            <label for=""></label>
            <input id="input-build-report" type="file" accept=".txt" @change="onFileChanged">
        </template>

        <div id="container"></div>
   </MainLayout>
</template>
