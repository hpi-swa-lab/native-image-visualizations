s
<script setup lang="ts">
import { Universe } from '../../ts/UniverseTypes/Universe'
import { loadJson, parseReachabilityExport } from '../../ts/parsing'
import {
    globalConfigStore,
    vennConfigStore,
    treeLineConfigStore,
    sankeyTreeConfigStore,
    causalityGraphConfigStore
} from '../../ts/stores'

const store = globalConfigStore()

async function addUniverses(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files) return

    Array.from(input.files).forEach(async (file: File) => {
        const rawData = await loadJson(file)
        const newUniverse = new Universe(file.name, parseReachabilityExport(rawData))

        store.addUniverse(newUniverse)
    })

    input.value = ''
}

function exportConfig() {
    const data = {
        global: store.toExportDict(),
        venn: vennConfigStore().toExportDict(),
        sankey: treeLineConfigStore().toExportDict(),
        treeLine: sankeyTreeConfigStore().toExportDict(),
        causalityGraph: causalityGraphConfigStore().toExportDict()
    }

    const dataString = `data:text/json;charset=utf-8, ${encodeURIComponent(JSON.stringify(data))}`

    const anchor = document.createElement('a')
    anchor.setAttribute('href', dataString)
    anchor.setAttribute('download', 'data-config.json')

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
}
</script>

<template>
    <div class="space-y-4">
        <label for="container-config-operations">Config Operations:</label>
        <div id="container-config-operations" class="space-y-4">
            <button class="btn btn-primary w-full" @click="exportConfig">
                <font-awesome-icon icon="fa-file-export" />
                Export config
            </button>
        </div>
        <hr />

        <div>
            <label for="input-report-data">Upload Build Reports:</label>
            <input
                id="input-report-data"
                class="w-full"
                type="file"
                accept="json"
                required
                multiple
                @change="addUniverses"
            />
        </div>
        <hr />

        <label for="container-universes">Current Universes:</label>
        <div id="container-universes" class="space-y-4">
            <div
                v-for="(universe, index) in store.universes"
                :key="index"
                class="flex items-center justify-between space-x-2"
            >
                <p class="overflow-x-hidden">{{ universe.name }}</p>
                <button class="btn btn-danger" @click="() => store.removeUniverse(universe.name)">
                    X
                </button>
            </div>
        </div>
    </div>
</template>
