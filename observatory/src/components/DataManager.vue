<script setup lang="ts">
import { ref } from 'vue'
import { EventType } from '../ts/enums/EventType'

import ElevatedLayer from './layouts/ElevatedLayer.vue'

import { NamedUniverse } from '../ts/UniverseTypes/NamedUniverse'
import { loadJson, parseReachabilityExport } from '../ts/parsing'
import MainLayout from './layouts/MainLayout.vue'
import { PageType } from '../ts/enums/PageType'

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

function removeUniverse(universeName: string) {
    if (!currentUniverses.value) return

    const removedUniverse = (currentUniverses.value as NamedUniverse[]).find(
        (universe: NamedUniverse) => {
            return universe.name === universeName
        }
    )
    if (removedUniverse) {
        currentUniverses.value.splice(currentUniverses.value.indexOf(removedUniverse), 1)
        emit(EventType.UNIVERSE_REMOVED, universeName)
    }
}

function updateRechabilityExport(event: Event) {
    if (!event.target) return

    const inputElement = event.target as HTMLInputElement

    if (!inputElement.files) return

    form.value.rechabilityExportFile = inputElement.files[0]
}

async function submit() {
    if (!form.value.name || !form.value.rechabilityExportFile) return

    const rawData = await loadJson(form.value.rechabilityExportFile)
    const newUniverse = {
        name: form.value.name,
        root: parseReachabilityExport(rawData)
    }

    currentUniverses.value.push(newUniverse)
    emit(EventType.UNIVERSE_CREATED, newUniverse)
}
</script>

<template>
    <MainLayout title="Data Manager" :page-type="PageType.DataManager">
        <template #controls >
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
                            @click="() => removeUniverse(universe.name)"
                        >
                            X
                        </button>
                    </div>
                </ElevatedLayer>
            </div>
        </template>

        <form class="flex flex-col items-center p-4 space-y-10" @submit.prevent="submit">
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
                    />
                    <p class="help-text">
                        Please name the universe you are about to upload. This allows you to
                        better recognize it later on in the visualizations.
                    </p>
                </div>
                <div class="space-y-4">
                    <label>Reachability-Export</label>
                    <input
                        type="file"
                        accept="json"
                        required
                        @change="updateRechabilityExport"
                    />
                    <p class="help-text">Some text</p>
                </div>
                
                <button class="btn btn-primary">Add Universe</button>
            </ElevatedLayer>            
        </form>
    </MainLayout>
</template>
