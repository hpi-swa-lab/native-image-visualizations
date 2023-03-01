<script setup lang="ts">
import { ref } from 'vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { loadJson, parseReachabilityExport } from '../../ts/parsing'
import { useGlobalStore, CONFIG_NAME } from '../../ts/stores/globalStore'
import { useVennStore } from '../../ts/stores/vennStore'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'
import { useTreeLineStore } from '../../ts/stores/treeLineStore'
import { useCausalityGraphStore } from '../../ts/stores/causalityGraphStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import InlineEditableField from './InlineEditableField.vue'
import JSZip from 'jszip'
import FileSaver from 'file-saver'
import { InvalidInputError } from '../../ts/errors'

const globalStore = useGlobalStore()
const vennStore = useVennStore()
const treeLineStore = useTreeLineStore()
const causalityGraphStore = useCausalityGraphStore()
const sankeyStore = useSankeyStore()

const uploadError = ref<Error | undefined>(undefined)

function validateFileAndAddUniverseOnSuccess(file: File, universeName: string): void {
    loadJson(file)
        .then((parsedJSON) => {
            const newUniverse = new Universe(
                universeName,
                parseReachabilityExport(parsedJSON, universeName)
            )
            try {
                globalStore.addUniverse(newUniverse, parsedJSON)
                uploadError.value = undefined
            } catch (error: unknown) {
                if (error instanceof Error) {
                    uploadError.value = error
                }
            }
        })
        .catch((error) => {
            uploadError.value = error
        })
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
    const rawData = globalStore.rawData

    const configData = {
        global: globalStore.toExportDict(),
        venn: vennStore.toExportDict(),
        sankey: sankeyStore.toExportDict(),
        treeLine: treeLineStore.toExportDict(),
        causalityGraph: causalityGraphStore.toExportDict()
    }

    const zip = new JSZip()
    zip.file(CONFIG_NAME, JSON.stringify(configData))
    Object.entries(rawData).forEach(([universeName, data]) => {
        zip.file(`${universeName}.json`, JSON.stringify(data))
    })

    zip.generateAsync({ type: 'blob' }).then((content) => {
        FileSaver.saveAs(content, 'data-and-config.zip')
    })
}

function changeUniverseName(oldName: string, newName: string) {
    try {
        globalStore.updateUniverseName(oldName, newName)
    } catch (error: unknown) {
        if (error instanceof InvalidInputError) {
            alert(error.message)
        } else {
            alert('An unknown error happened')
        }
    }
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
            <label for="container-universes" class="block">Current Universes:</label>
            <p v-if="globalStore.universes.length === 0" class="ml-2">None</p>
            <div id="container-universes" class="space-y-2">
                <div
                    v-for="(universe, index) in globalStore.universes"
                    :key="index"
                    class="flex items-center justify-between space-x-2"
                >
                    <InlineEditableField
                        :label="universe.name"
                        class="flex-auto"
                        @change.self="
                            (newName) => {
                                changeUniverseName(universe.name, newName)
                            }
                        "
                    />
                    <button
                        class="btn-sm btn-danger"
                        @click="() => globalStore.removeUniverse(universe.name)"
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
