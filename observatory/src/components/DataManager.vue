<script setup lang="ts">
import { ref } from 'vue'
import { EventType } from '../ts/enums/EventType'

import ElevatedLayer from './ElevatedLayer.vue'

import { NamedUniverse } from '../ts/UniverseTypes/NamedUniverse'
import { loadJson, parseReachabilityExport } from '../ts/parsing'
import MainLayout from './MainLayout.vue'
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

    // eslint-disable-next-line prefer-destructuring
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
        
        <form @submit.prevent="submit">
            <h3>Add a new Universe</h3>
            <ElevatedLayer>
                <label for="input-universe-name"><h3>Universe Name</h3></label>
                <p>
                    Please name the universe you are about to upload. This allows you to
                    better recognize it later on in the visualizations.
                </p>
                <input
                    id="input-universe-name"
                    v-model="form.name"
                    type="text"
                    placeholder="Awesome Universe Name"
                    required
                />
            </ElevatedLayer>

            <ElevatedLayer>
                <label><h3>Reachability-Export</h3></label>
                <p></p>
                <input
                    type="file"
                    accept="json"
                    required
                    @change="updateRechabilityExport"
                />
            </ElevatedLayer>
        </form>
    </MainLayout>
</template>
