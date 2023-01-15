<script setup lang="ts">
import {Ref, ref} from 'vue'
import { loadBuildReport, loadTextFile, parseBuildReportToNodeWithSizeHierarchy, parseToPackageHierarchy } from '../ts/BuildReportsParser';
import HierarchyNodeWithSize from '../ts/interfaces/HierarchyNodeWithSize';
import HierarchyNode from '../ts/interfaces/HierarchyNode';

interface Emits {
    (event: 'node-with-size-hierarchy-changed', data: HierarchyNodeWithSize): void
    (event: 'package-hierarchy-changed', data: HierarchyNode): void
}

const emit = defineEmits<Emits>()

const inputConsoleOutput = ref<HTMLInputElement | null>(null)
const inputCallTreeEntryPoints = ref<HTMLInputElement>()
const inputCallTreeMethods = ref<HTMLInputElement>()
const inputCallTreeDirectEdges = ref<HTMLInputElement>()
const inputCallTreeVirtualEdges = ref<HTMLInputElement>()
const inputUsedMethods = ref<HTMLInputElement>()

let loading = false;

const loadData = async () => {
    loading = true

    await Promise.all([
        updateNodeWithSizeHierachy(),
        updatePackageHierarchy()
    ])
    
    loading = false
}

async function updateNodeWithSizeHierachy(): Promise<void> {
    if (inputConsoleOutput && inputConsoleOutput.files && inputConsoleOutput.files[0]) {
        const rawData = await loadBuildReport(inputConsoleOutput.files[0])
        const data = parseBuildReportToNodeWithSizeHierarchy(rawData)
        emit('node-with-size-hierarchy-changed', data)
    }
}

async function updatePackageHierarchy(): Promise<void> {
    if (inputUsedMethods && inputUsedMethods.files && inputUsedMethods.files[0]) {
        const rawData = await loadTextFile(inputUsedMethods.files[0])
        const data = parseToPackageHierarchy(rawData)
        emit('package-hierarchy-changed', data)
    }
}

</script>

<template>
    <div class="sticky-top">
        <input ref="inputConsoleOutput" type="file" accept=".txt"/>
        <input ref="inputCallTreeEntryPoints" type="file" accept=".csv"/>
        <input ref="inputCallTreeMethods" type="file" accept=".csv"/>
        <input ref="inputCallTreeDirectEdges" type="file" accept=".csv"/>
        <input ref="inputCallTreeVirtualEdges" type="file" accept=".csv"/>
        <input ref="inputUsedMethods" type="file" accept=".txt" />

        <button @click="loadData">
            <b-spinner v-if="loading" label="Spinning"></b-spinner>
            <p v-if="!loading">Load Data</p>
        </button>
    </div>
</template>
