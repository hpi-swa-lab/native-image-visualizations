<script setup lang="ts">
import { ref } from 'vue'
import { EventType } from '../ts/enums/EventType'

import ElevatedLayer from './layouts/ElevatedLayer.vue'

import { NamedUniverse } from '../ts/UniverseTypes/NamedUniverse'
import { loadJson, parseReachabilityExport } from '../ts/parsing'
import MainLayout from './layouts/MainLayout.vue'
import { SwappableComponentType } from '../ts/enums/SwappableComponentType'

const emit = defineEmits([EventType.UNIVERSE_REMOVED, EventType.UNIVERSE_CREATED])

const props = withDefaults(
    defineProps<{
        universes: NamedUniverse[]
    }>(),
    {
        universes: () => []
    }
)

const currentUniverses = ref<NamedUniverse[]>(props.universes)

const form = ref<HTMLFormElement>()
const nameInput = ref<HTMLInputElement>()
const dataInput = ref<HTMLInputElement>()

const formContents = ref<{
    name?: string
    rechabilityExportFile?: File
}>({})

function validateAndUpdateRechabilityExport() {
    const input = dataInput.value as HTMLInputElement

    if (!input.files || !input.files[0]) {
        input.setCustomValidity('You must the data to create a universe')
    } else {
        input.setCustomValidity('')
        formContents.value.rechabilityExportFile = input.files[0]
    }

    input.reportValidity()
}

function validateAndUpdateName() {
    const input = nameInput.value as HTMLInputElement
    const name = input.value

    const universes = currentUniverses.value as NamedUniverse[]
    const universeNames = universes.map((universe: NamedUniverse) => universe.name)

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
    validateAndUpdateRechabilityExport()

    if (!form.value?.checkValidity()) return

    if (!formContents.value.name || !formContents.value.rechabilityExportFile) return

    const rawData = await loadJson(formContents.value.rechabilityExportFile)
    const newUniverse = {
        name: formContents.value.name,
        root: parseReachabilityExport(rawData)
    }

    emit(EventType.UNIVERSE_CREATED, newUniverse)
}
</script>

<template>
    <MainLayout title="Data Manager" :component-type="SwappableComponentType.DataManager">
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
                    <label>Reachability-Export</label>
                    <input
                        ref="dataInput"
                        type="file"
                        accept="json"
                        required
                        @change="validateAndUpdateRechabilityExport"
                    />
                    <p class="help-text">Some text</p>
                </div>

                <button class="btn btn-primary">Add Universe</button>
            </ElevatedLayer>
        </form>
    </MainLayout>
</template>
