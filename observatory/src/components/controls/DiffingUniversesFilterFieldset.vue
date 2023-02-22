<script setup lang="ts">
import {
    COLOR_MODIFIED,
    COLOR_UNMODIFIED,
    UNMODIFIED
} from '../../ts/constants/SankeyTreeConstants'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import ColorLabel from './ColorLabel.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { sankeyTreeConfigStore } from '../../ts/stores'

defineProps<{
    universesMetadata: Record<string, UniverseProps>
}>()

const sankeyTreeStore = sankeyTreeConfigStore()
</script>

<template>
    <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Universes to display:</legend>

        <ToggleSwitch
            v-for="key in Object.keys(universesMetadata)"
            :id="key"
            :key="key"
            :value="universesMetadata[key].name"
            :checked="sankeyTreeStore.isUniverseFiltered(key)"
            @input="sankeyTreeStore.changeUniverseSelection($event.target.id)"
        >
            <ColorLabel
                :for-element="key"
                :label="universesMetadata[key].name"
                :color="universesMetadata[key].color"
            ></ColorLabel>
        </ToggleSwitch>

        <ToggleSwitch
            :id="UNMODIFIED"
            :value="UNMODIFIED"
            :checked="sankeyTreeStore.diffingFilter.showUnmodified"
            @input="sankeyTreeStore.setShowUnmodified($event.target.checked)"
        >
            <ColorLabel :for-element="UNMODIFIED" label="unmodified packages" :color="COLOR_UNMODIFIED"></ColorLabel>
        </ToggleSwitch>

        <ColorLabel label="modified packages" :color="COLOR_MODIFIED"></ColorLabel>
    </fieldset>
</template>
