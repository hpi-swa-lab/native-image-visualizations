<script setup lang="ts">
import { ref } from 'vue'
import { EventType } from '../ts/enums/EventType'

import ElevatedLayer from './layouts/ElevatedLayer.vue'

import { Universe } from '../ts/UniverseTypes/Universe'
import { loadJson, parseReachabilityExport } from '../ts/parsing'
import MainLayout from './layouts/MainLayout.vue'
import { SwappableComponentType } from '../ts/enums/SwappableComponentType'

const emit = defineEmits([
    EventType.CHANGE_PAGE,
    EventType.UNIVERSE_REMOVED,
    EventType.UNIVERSE_CREATED
])

const props = withDefaults(
    defineProps<{
        universes: Universe[]
        previousComponent?: SwappableComponentType | undefined
    }>(),
    {
        universes: () => [],
        previousComponent: undefined
    }
)

const currentUniverses = ref<Universe[]>(props.universes)

const form = ref<HTMLFormElement>()
const nameInput = ref<HTMLInputElement>()
const dataInput = ref<HTMLInputElement>()

const formContents = ref<{
    name?: string
    reachabilityExportFile?: File
}>({})

function validateAndUpdateReachabilityExport() {
    const input = dataInput.value as HTMLInputElement

    if (!input.files || !input.files[0]) {
        input.setCustomValidity(
            'You need to upload a reachability export in order to create a universe.'
        )
    } else {
        input.setCustomValidity('')
        formContents.value.reachabilityExportFile = input.files[0]
    }

    input.reportValidity()
}

function validateAndUpdateName() {
    const input = nameInput.value as HTMLInputElement
    const name = input.value

    const universes = currentUniverses.value as Universe[]
    const universeNames = universes.map((universe: Universe) => universe.name)

    if (input.validity.valueMissing) {
        input.setCustomValidity('You must give this universe a name.')
    } else if (universeNames.includes(name)) {
        input.setCustomValidity('This name already exists.')
    } else {
        input.setCustomValidity('')
        formContents.value.name = name
    }

    input.reportValidity()
}

async function addUniverse() {
    validateAndUpdateName()
    validateAndUpdateReachabilityExport()

    if (!form.value?.checkValidity()) return

    if (!formContents.value.name || !formContents.value.reachabilityExportFile) return

    const rawData = await loadJson(formContents.value.reachabilityExportFile)
    const newUniverse = new Universe(formContents.value.name, parseReachabilityExport(rawData, formContents.value.name))

    emit(EventType.UNIVERSE_CREATED, newUniverse)
}
</script>

<template>
    <MainLayout
        title="Data Manager"
        :component-type="SwappableComponentType.DataManager"
        :previous-component="previousComponent"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentType)"
    >
        <template #controls>
            <div class="space-y-10">
                <h3>Manage Existing Universes</h3>
                <ElevatedLayer>
                    <p v-if="currentUniverses.length === 0">
                        Currently, there are no universes uploaded.
                    </p>
                    <div
                        v-for="(universe, index) in currentUniverses"
                        :key="index"
                        class="flex items-center justify-between"
                    >
                        {{ universe.name }}
                        <button
                            class="btn btn-danger"
                            @click="() => emit(EventType.UNIVERSE_REMOVED, universe.name)"
                        >
                            X
                        </button>
                    </div>
                </ElevatedLayer>
            </div>
        </template>

        <form
            ref="form"
            class="flex flex-col items-center p-4 space-y-10"
            @submit.prevent="addUniverse"
        >
            <h2 class="w-2/3">Add a new Universe</h2>
            <ElevatedLayer class="w-2/3 space-y-[3rem]">
                <div class="space-y-4">
                    <label for="input-universe-name">Universe Name</label>
                    <input
                        ref="nameInput"
                        v-model="formContents.name"
                        class="w-full"
                        type="text"
                        placeholder="Awesome Universe Name"
                        required
                        @input="validateAndUpdateName"
                    />
                    <p class="help-text">
                        Please name the universe you are about to upload. This allows you to better
                        recognize it later on in the visualizations.
                    </p>
                </div>
                <div class="space-y-4">
                    <label>Reachability Export</label>
                    <input
                        ref="dataInput"
                        class="w-full"
                        type="file"
                        accept="json"
                        required
                        @change="validateAndUpdateReachabilityExport"
                    />
                    <p class="help-text">
                        Please upload the reachability analysis data that came out of your
                        native-image build process.
                    </p>
                </div>

                <button class="btn btn-primary">Add Universe</button>
            </ElevatedLayer>
        </form>
    </MainLayout>
</template>
