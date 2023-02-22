<script setup lang="ts">
import { globalConfigStore } from '../../ts/stores'
import ToggleSwitch from './ToggleSwitch.vue'
import ElevatedLayer from '../layouts/ElevatedLayer.vue'

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

            <ElevatedLayer :y-spacing="2">
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
                    <template #preceding>
                        <label :for="universe.name + index" class="flex-auto">
                            {{ universe.name }}
                        </label>
                    </template>
                </ToggleSwitch>
            </ElevatedLayer>
        </label>
    </div>
</template>

<style scoped>
>>> input {
    width: 25px;
    height: 25px;
}
</style>
