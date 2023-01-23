<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import { loadBuildReport, parseBuildReportToNodeWithSizeHierarchy } from '../ts/BuildReportsParser'
import HierarchyNodeWithSize from '../ts/SharedInterfaces/HierarchyNodeWithSize'
import { removeChildren } from '../ts/utils'
import TreeLine from '../ts/Visualizations/TreeLine'

const inputBuildReport = ref<HTMLInputElement>()
const container = ref<HTMLDivElement>()

let data: HierarchyNodeWithSize | undefined
let visualization: TreeLine | undefined

async function generateTreeLine() {
    const inputElement = inputBuildReport.value

    let universes = new Map()
    if (inputElement && inputElement.files) {
        for (let i = 0; i < inputElement.files.length; i++) {
            const file = inputElement.files[i]
            const rawData = await loadBuildReport(file)
            data = parseBuildReportToNodeWithSizeHierarchy(rawData)
            universes.set(`build-${i}`, data)
        }
    }
    
    if (universes.size == 0) {
        return;
    }

    if (container.value !== undefined) {
        removeChildren(container.value)
    }

    visualization = new TreeLine(universes, new Map(
        Object.entries({
            'build-0': '#1b9e77',
            'build-1': '#72286f'
            // 'helloworld': '#f28e2c',
            // 'micronaut': '#ffdd00',
        })
    ))
    visualization.generate()
}
</script>

<template>
    <MainLayout>
        <template #title>Tree Line</template>
        <template #controls>
            <label for="" />
            <input ref="inputBuildReport" type="file" accept=".txt" />
            <button class="btn btn-primary" @click="generateTreeLine">Start</button>
        </template>

        <div id="tree-line-container" ref="container" class="w-full h-full" />
    </MainLayout>
</template>
