<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from './ToggleSwitch.vue'

const MAX_OBSERVABLE_UNIVERSES = 5

const store = useGlobalStore()

function isChecked(universeName: string) {
    return store.observedUniverses.some((universe) => universe.name == universeName)
}

function isDisabled(universeName: string) {
    return (
        store.observedUniverses.length === MAX_OBSERVABLE_UNIVERSES &&
        !store.observedUniverses.some((universe) => universe.name == universeName)
    )
}

async function toggleUniverse(universeName: string) {
    document.body.classList.toggle('loadingIcon', true)
    try {
        await new Promise((r) => setTimeout(r, 1))
        store.toggleObservationByName(universeName)
    } finally {
        document.body.classList.toggle('loadingIcon', false)
    }
}
</script>

<template>
    <div>
        <label for="universe-selection" class="block">Universes to observe:</label>

        <div id="universe-selection" class="space-y-2">
            <p v-if="store.universes.length === 0">Add universes via the Data Manager.</p>
            <ToggleSwitch
                v-for="(universe, index) in store.universes"
                :id="universe.name + index"
                :key="index"
                :value="universe.name"
                :checked="isChecked(universe.name)"
                :disabled="isDisabled(universe.name)"
                class="flex flex-row justify-between"
                @change.self="toggleUniverse"
            >
                <label
                    :for="universe.name + index"
                    class="flex-auto overflow-x-hidden ml-1 my-auto block"
                >
                    {{ universe.name }}
                </label>
                <input
                    type="color"
                    class="mr-1 w-[25px] h-[25px] p-0 align-middle border-none"
                    :value="universe.color"
                    disabled
                />
            </ToggleSwitch>
        </div>
    </div>
</template>
