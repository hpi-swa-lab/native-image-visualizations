<script setup lang="ts">
import { globalConfigStore } from '../../ts/stores'
import ToggleSwitch from './ToggleSwitch.vue'

const MAX_OBSERVABLE_UNIVERSES = 2

const store = globalConfigStore()

function isChecked(universeName: string) {
    return store.observedUniverses.some((universe) => universe.name == universeName)
}

function isDisabled(universeName: string) {
    return (
        store.observedUniverses.length === MAX_OBSERVABLE_UNIVERSES &&
        !store.observedUniverses.some((universe) => universe.name == universeName)
    )
}
</script>

<template>
    <div>
        <label>
            <p class="mb-2">Universes to observe:</p>

            <div class="space-y-2">
                <p v-if="store.universes.length === 0">Add universes via the Data Manager.</p>
                <ToggleSwitch
                    v-for="(universe, index) in store.universes"
                    :id="universe.name + index"
                    :key="index"
                    :value="universe.name"
                    :checked="isChecked(universe.name)"
                    :disabled="isDisabled(universe.name)"
                    class="flex flex-row justify-between"
                    @change.self="store.toggleUniverseByName"
                >
                    <label :for="universe.name + index" class="flex-auto overflow-x-hidden ml-1">
                        {{ universe.name }}
                    </label>
                </ToggleSwitch>
            </div>
        </label>
    </div>
</template>

<style scoped>
>>> input {
    width: 25px;
    height: 25px;
}
</style>
