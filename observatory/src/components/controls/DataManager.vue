<script setup lang="ts">
import { ref } from 'vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse'
import { loadJson, loadCgZip, parseReachabilityExport } from '../../ts/parsing'
import { useGlobalStore, CONFIG_NAME } from '../../ts/stores/globalStore'
import { useVennStore } from '../../ts/stores/vennStore'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'
import { useTreeLineStore } from '../../ts/stores/treeLineStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import InlineEditableField from '../simpleUiElements/InlineEditableField.vue'
import JSZip from 'jszip'
import FileSaver from 'file-saver'
import { InvalidInputError } from '../../ts/errors'
import { ExportConfig } from '../../ts/stores/ExportConfig'
import { EventType } from '../../ts/enums/EventType'
import { useCutToolStore } from '../../ts/stores/cutToolStore'

const emit = defineEmits([EventType.CONFIG_LOADED])

const globalStore = useGlobalStore()
const vennStore = useVennStore()
const treeLineStore = useTreeLineStore()
const sankeyStore = useSankeyStore()
const cutToolStore = useCutToolStore()

const uploadError = ref<Error | undefined>(undefined)
const configLoadError = ref<Error | undefined>(undefined)

const nameFields = ref<InstanceType<typeof InlineEditableField>[]>()

async function createUniverseFromCausalityExport(
    file: File,
    universeName: string
): Promise<Universe> {
    const parsedCG = await loadCgZip(file)
    const newUniverse = new CausalityGraphUniverse(
        universeName,
        globalStore.nextUniverseColor,
        parseReachabilityExport(parsedCG.reachabilityData, universeName),
        parsedCG
    )
    return newUniverse
}

async function createUniverseFromReachabilityJson(
    file: File,
    universeName: string
): Promise<Universe> {
    const parsedJSON = await loadJson(file)

    const newUniverse = new Universe(
        universeName,
        globalStore.nextUniverseColor,
        parseReachabilityExport(parsedJSON, universeName)
    )

    return newUniverse
}

async function validateFileAndAddUniverseOnSuccess(
    file: File,
    universeName: string
): Promise<void> {
    try {
        let newUniverse: Universe

        if (file.name.endsWith('.cg.zip')) {
            newUniverse = await createUniverseFromCausalityExport(file, universeName)
        } else if (file.name.endsWith('.json')) {
            newUniverse = await createUniverseFromReachabilityJson(file, universeName)
        } else {
            throw new Error('Unknown file ending')
        }
        globalStore.addUniverse(newUniverse, file)
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
        cutTool: cutToolStore.toExportDict()
    }

    const zip = new JSZip()
    zip.file(`${CONFIG_NAME}.json`, JSON.stringify(configData))
    Object.entries(rawData).forEach(([universeName, data]) => {
        zip.file(`${rawDataSubDirectoryName}/${universeName}/${data.name}`, data)
    })

    zip.generateAsync({ type: 'blob' }).then((content) => {
        FileSaver.saveAs(content, Object.keys(rawData).join('-') + '.observatory-config.zip')
    })
}

async function loadConfigAndData(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files) {
        configLoadError.value = Error(
            'The loading function was triggered, but the input element does not hold any files.'
        )
        return
    }

    let errors: string[] = []
    const zip = await JSZip.loadAsync(input.files[0])

    errors = errors.concat(await loadData(zip))
    errors = errors.concat(await loadConfig(zip))

    if (errors.length > 0) {
        configLoadError.value = Error(errors.join('\n'))
    } else {
        configLoadError.value = undefined
        emit(EventType.CONFIG_LOADED)
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

const rawDataSubDirectoryName = 'universe-data'

async function loadData(zip: JSZip): Promise<string[]> {
    globalStore.$reset()

    const errors: string[] = []

    const universeNames = Object.keys(zip.files)
        .map((filename) => filename.match(`^${rawDataSubDirectoryName}\/([^/]+)\/$`))
        .filter((m) => m)
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
        .map((m) => m![1])

    await Promise.all(
        universeNames.map(async (universeName: string) => {
            try {
                const subdir = 'universe-data/' + universeName + '/'
                const inputDataFile = Object.values(zip.files).find(
                    (file) => file.name.length > subdir.length && file.name.startsWith(subdir)
                )
                if (!inputDataFile) throw Error('Unexpected empty directory in config export')

                // The input routine depends on the name to distinguish types of data.
                const fileNameParts = inputDataFile.name.split('/')
                const fileName = fileNameParts[fileNameParts.length - 1]

                // We need the name for choosing the right parse subroutine,
                // therefore creating a new file object
                const file = new File([await inputDataFile.async('blob')], fileName)
                await validateFileAndAddUniverseOnSuccess(file, universeName)
            } catch (error: unknown) {
                if (error instanceof Error) {
                    errors.push(
                        `Failed loading the universe '${universeName}' due to the following error: ${error.message}`
                    )
                }
            }
        })
    )

    return errors
}

async function loadConfig(zip: JSZip): Promise<string[]> {
    if (!(`${CONFIG_NAME}.json` in zip.files)) {
        return [`The config.zip does not include the expected '${CONFIG_NAME}.json' file`]
    }

    const errors: string[] = []

    const rawConfig = await zip.files[`${CONFIG_NAME}.json`].async('string')
    const config = JSON.parse(rawConfig)

    const configMappings = [
        {
            name: 'venn',
            store: vennStore
        },
        {
            name: 'sankey',
            store: sankeyStore
        },
        {
            name: 'treeLine',
            store: treeLineStore
        },
        {
            name: 'global',
            store: globalStore
        },
        {
            name: 'cutTool',
            store: cutToolStore
        }
    ]

    configMappings.forEach((mapping) => {
        if (mapping.name in config) {
            mapping.store.loadExportDict(config[mapping.name])
        } else {
            errors.push(`
                    Could not load the ${mapping.name} config,
                    as the key '${mapping.name}' is not present
                    in the config
                `)
        }
    })

    return errors
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
                @change="loadConfigAndData"
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
