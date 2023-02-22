<script setup lang="ts">
import { ref } from 'vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { loadJson, parseReachabilityExport } from '../../ts/parsing'
import {
    globalConfigStore,
    vennConfigStore,
    treeLineConfigStore,
    sankeyTreeConfigStore,
    causalityGraphConfigStore
} from '../../ts/stores'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const store = globalConfigStore()
const uploadError = ref<Error | undefined>(undefined)

function validateFileAndAddUniverseOnSuccess(file: File, universeName: string): void {
    loadJson(file)
        .then((parsedJSON) => {
            const newUniverse = new Universe(
                universeName,
                parseReachabilityExport(parsedJSON, universeName)
            )
            store.addUniverse(newUniverse)
            uploadError.value = undefined
        })
        .catch((error) => {
            uploadError.value = error
        })
}

function addUniverses(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files) return

    Array.from(input.files).forEach((file: File) =>
        validateFileAndAddUniverseOnSuccess(file, file.name)
    )

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
        <div class="mb-2">
            <label for="input-report-data" class="block">Upload Build Reports:</label>
            <input
                id="input-report-data"
                class="w-full space-y-4"
                type="file"
                accept="application/json"
                required
                multiple
                @change="addUniverses"
            />

            <p v-if="uploadError" class="error-text space-y-4">
                {{ uploadError.message }}
            </p>
        </div>

        <div>
            <label for="container-universes" class="block"
                >Current Universes:</label
            >
            <p v-if="store.universes.length === 0" class="ml-2">None</p>
            <div id="container-universes" class="space-y-2">
                <div
                    v-for="(universe, index) in store.universes"
                    :key="index"
                    class="flex items-center justify-between space-x-2"
                >
                    <label class="overflow-x-hidden ml-2 my-auto">{{ universe.name }}</label>
                    <button
                        class="btn-sm btn-danger"
                        @click="() => store.removeUniverse(universe.name)"
                    >
                        <font-awesome-icon icon="xmark" />
                    </button>
                </div>
            </div>
        </div>

        <hr />
        <div id="container-config-operations" class="space-y-4">
            <button class="btn btn-primary w-full" @click="exportConfig">
                <font-awesome-icon icon="fa-file-export" />
                Export config
            </button>
        </div>
    </div>
</template>
