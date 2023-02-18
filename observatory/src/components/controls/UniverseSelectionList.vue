<script setup lang="ts">
import { globalConfigStore } from '../../ts/stores'
import ToggleSwitch from './ToggleSwitch.vue'

const store = globalConfigStore()

function isChecked(universeName: string) {
    return store.selectedUniverses.map((universe) => universe.name).includes(universeName)
}

function isDisabled(universeName: string) {
    return (
        store.selectedUniverses.length === 2 &&
        !store.selectedUniverses.map((universe) => universe.name).includes(universeName)
    )
}
</script>

<template>
    <div>
        <label
            >Universes to diff:
            <ToggleSwitch
                v-for="(universe, index) in store.universes"
                :id="universe.name + index"
                :key="index"
                :value="universe.name"
                :checked="isChecked(universe.name)"
                :disabled="isDisabled(universe.name)"
                @change="store.toggleUniverseByName"
            >
                {{ universe.name }}
            </ToggleSwitch>
        </label>
    </div>
</template>
