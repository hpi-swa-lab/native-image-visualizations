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
import { ExportConfig } from '../../ts/stores/ExportConfig'

const globalStore = useGlobalStore()
const vennStore = useVennStore()
const treeLineStore = useTreeLineStore()
const causalityGraphStore = useCausalityGraphStore()
const sankeyStore = useSankeyStore()

const uploadError = ref<Error | undefined>(undefined)
const configLoadError = ref<Error | undefined>(undefined)

const nameFields = ref<InstanceType<typeof InlineEditableField>[]>()

async function validateFileAndAddUniverseOnSuccess(
    file: File,
    universeName: string
): Promise<void> {
    try {
        const parsedJSON = await loadJson(file)
        await loadUniverseData(parsedJSON, universeName)

        uploadError.value = undefined
    } catch (error: unknown) {
        if (error instanceof Error) {
            uploadError.value = error
        }
    }
}

async function loadUniverseData(
    universeData: Record<string, any>,
    universeName: string
): Promise<void> {
    const newUniverse = new Universe(
        universeName,
        parseReachabilityExport(universeData, universeName)
    )

    globalStore.addUniverse(newUniverse, universeData)
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

async function loadConfig(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files) {
        configLoadError.value = Error(
            'The loading function was triggert, but the input element does not hold any files.'
        )
        return
    }

    const errors: string[] = []

    const zip = await JSZip.loadAsync(input.files[0])

    await Promise.all(
        Object.keys(zip.files)
            .filter((filename: string) => filename !== `${CONFIG_NAME}.json`)
            .map(async (filename: string) => {
                const universeName = filename.replace(/\.[^/.]+$/, '')

                try {
                    const rawData = await zip.files[filename].async('string')
                    const parsedJSON = JSON.parse(rawData)

                    await loadUniverseData(parsedJSON, universeName)
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        errors.push(`Failed loading the universe '${universeName}'`)
                    }
                }
            })
    )

    if (!(`${CONFIG_NAME}.json` in zip.files)) {
        errors.push(`The config.zip does not include the expected '${CONFIG_NAME}.json' file`)
    }

    if (errors.length > 0) {
        configLoadError.value = Error(errors.join('\n'))
    } else {
        configLoadError.value = undefined
    }
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
            <label for="input-config" class="block">Upload a Config Archive:</label>
            <input
                id="input-config"
                class="w-full space-y-4"
                type="file"
                accept="application/zip"
                @change="loadConfig"
            />

            <p v-if="configLoadError" class="warning-text space-y-4">
                {{ configLoadError.message }}
            </p>
        </div>

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
