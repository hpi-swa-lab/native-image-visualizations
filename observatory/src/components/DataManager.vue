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
        next: string
        universes: NamedUniverse[]
    }>(),
    {
        next: '/',
        universes: () => []
    }
)

const currentUniverses = ref<NamedUniverse[]>(props.universes)

const form = ref<{
    name?: string
    rechabilityExportFile?: File
}>({})

function validateAndUpdateRechabilityExport(event: Event) {
    if (!event.target) return

    const inputElement = event.target as HTMLInputElement

    if (!inputElement.files || !inputElement.files[0]) {
        inputElement.setCustomValidity('You must the data to create a universe')
    } else {
        inputElement.setCustomValidity('')
        form.value.rechabilityExportFile = inputElement.files[0]
    }

    inputElement.reportValidity()
}

function validateAndUpdateName(event: Event) {
    if (!event.target) return

    const input = event.target as HTMLInputElement
    const name = input.value

    const universes = currentUniverses.value as NamedUniverse[]
    const universeNames = universes.map((universe: NamedUniverse) => universe.name)

    if (input.validity.valueMissing) {
        input.setCustomValidity('You must give this universe a name.')
    } else if (universeNames.includes(name)) {
        input.setCustomValidity('This name already exists.')
    } else {
        input.setCustomValidity('')
        form.value.name = name
    }

    input.reportValidity()
}

async function addUniverse() {
    if (!form.value.name || !form.value.rechabilityExportFile) return

    const rawData = await loadJson(form.value.rechabilityExportFile)
    const newUniverse = {
        name: form.value.name,
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

        <form class="flex flex-col items-center p-4 space-y-10" @submit.prevent="addUniverse">
            <h2 class="w-2/3">Add a new Universe</h2>
            <ElevatedLayer class="w-2/3 space-y-[3rem]">
                <div class="space-y-4">
                    <label for="input-universe-name">Universe Name</label>
                    <input
                        id="input-universe-name"
                        v-model="form.name"
                        type="text"
                        placeholder="Awesome Universe Name"
                        required
                        @change="validateAndUpdateName"
                    />
                    <p class="help-text">
                        Please name the universe you are about to upload. This allows you to better
                        recognize it later on in the visualizations.
                    </p>
                </div>
                <div class="space-y-4">
                    <label>Reachability-Export</label>
                    <input
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
