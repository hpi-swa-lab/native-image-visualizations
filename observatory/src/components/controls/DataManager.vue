<script setup lang="ts">
import { ref } from 'vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse'
import { loadJson, loadCgZip, parseReachabilityExport } from '../../ts/parsing'
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
import { ExportConfig } from '../../ts/stores/ExportConfig'

const globalStore = useGlobalStore()
const vennStore = useVennStore()
const treeLineStore = useTreeLineStore()
const causalityGraphStore = useCausalityGraphStore()
const sankeyStore = useSankeyStore()

const uploadError = ref<Error | undefined>(undefined)

const nameFields = ref<InstanceType<typeof InlineEditableField>[]>()

async function validateFileAndAddUniverseOnSuccess(
    file: File,
    universeName: string
): Promise<void> {
    try {
        let newUniverse: Universe
        let rawData

        if(file.name.endsWith('.cg.zip')) {
            const parsedCG = await loadCgZip(file)
            newUniverse = new CausalityGraphUniverse(
                    universeName,
                    parseReachabilityExport(parsedCG.reachabilityData, universeName),
                    parsedCG)
            rawData = parsedCG.reachabilityData
        } else if(file.name.endsWith('.json')) {
            const parsedJSON = await loadJson(file)
            newUniverse = new Universe(
                    universeName,
                    parseReachabilityExport(parsedJSON, universeName)
            )
            rawData = parsedJSON
        } else {
            throw new Error('Unknown file ending')
        }
        globalStore.addUniverse(newUniverse, rawData)
        uploadError.value = undefined
    } catch (error: unknown) {
        if (error instanceof Error) {
            uploadError.value = error
        }
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
    const rawData = globalStore.rawData

    const configData: Record<string, ExportConfig> = {
        global: globalStore.toExportDict(),
        venn: vennStore.toExportDict(),
        sankey: sankeyStore.toExportDict(),
        treeLine: treeLineStore.toExportDict(),
        causalityGraph: causalityGraphStore.toExportDict()
    }

    const zip = new JSZip()
    zip.file(`${CONFIG_NAME}.json`, JSON.stringify(configData))
    Object.entries(rawData).forEach(([universeName, data]) => {
        zip.file(`${universeName}.json`, JSON.stringify(data))
    })

    zip.generateAsync({ type: 'blob' }).then((content) => {
        FileSaver.saveAs(content, Object.keys(rawData).join('-') + 'observatory-config.zip')
    })
}

function changeUniverseName(oldName: string, newName: string, inputIndex: number) {
    try {
        globalStore.updateUniverseName(oldName, newName)
    } catch (error: unknown) {
        if (nameFields.value && nameFields.value[inputIndex]) {
            nameFields.value[inputIndex].reset()
        }
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
            <p v-if="globalStore.universes.length === 0" class="ml-2">None</p>
            <div id="container-universes" class="space-y-2">
                <div
                    v-for="(universe, index) in globalStore.universes"
                    :key="index"
                    class="flex items-center justify-between space-x-2"
                >
                    <InlineEditableField
                        ref="nameFields"
                        :label="universe.name"
                        class="flex-auto"
                        @change.self="
                            (newName) => {
                                changeUniverseName(universe.name, newName, index)
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
