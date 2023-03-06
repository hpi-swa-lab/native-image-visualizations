<script setup lang="ts">
import { ref } from 'vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse'
import { loadJson, loadCgZip, parseReachabilityExport } from '../../ts/parsing'
import {
    globalConfigStore,
    vennConfigStore,
    treeLineConfigStore,
    sankeyTreeConfigStore,
    causalityGraphConfigStore
} from '../../ts/stores'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import InlineEditableField from './InlineEditableField.vue'

const store = globalConfigStore()
const uploadError = ref<Error | undefined>(undefined)

function validateFileAndAddUniverseOnSuccess(file: File, universeName: string): void {

    if(file.name.endsWith('.cg.zip')) {
        loadCgZip(file)
                .then((parsedCG) => {
                    const newUniverse = new CausalityGraphUniverse(
                            universeName,
                            parseReachabilityExport(parsedCG.reachabilityData, universeName),
                            parsedCG)
                    store.addUniverse(newUniverse)
                    uploadError.value = undefined
                })
                .catch((error) => {
                    uploadError.value = error
                })
    } else if(file.name.endsWith('.json')) {
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
    } else {
        throw new Error('You stupid bastard shall not upload junk!')
    }
}

function addUniverses(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files) return

    Array.from(input.files).forEach((file: File) =>
        validateFileAndAddUniverseOnSuccess(file, file.name.split('.json')[0])
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
                accept="application/json,.cg.zip"
                required
                multiple
                @change="addUniverses"
            />

            <p v-if="uploadError" class="error-text space-y-4">
                {{ uploadError.message }}
            </p>
        </div>

        <div>
            <label for="container-universes" class="block">Current Universes:</label>
            <p v-if="store.universes.length === 0" class="ml-2">None</p>
            <div id="container-universes" class="space-y-2">
                <div
                    v-for="(universe, index) in store.universes"
                    :key="index"
                    class="flex items-center justify-between space-x-2"
                >
                    <InlineEditableField
                        :label="universe.name"
                        class="flex-auto"
                        @change.self="
                            (newUniverseName) =>
                                store.updateUniverseName(universe.name, newUniverseName)
                        "
                    />
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
