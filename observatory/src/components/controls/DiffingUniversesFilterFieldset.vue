<script setup lang="ts">
import { PropType } from 'vue'
import {
    COLOR_MODIFIED,
    COLOR_UNMODIFIED,
    UNMODIFIED
} from '../../ts/constants/SankeyTreeConstants'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import ColorLabel from './ColorLabel.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { sankeyTreeConfigStore } from '../../ts/stores'

defineProps({
    universesMetadata: {
        type: Object as PropType<Record<string, UniverseProps>>,
        required: true
    }
})

const sankeyTreeStore = sankeyTreeConfigStore()

function onUniverseSelectionChanged(universeId: string) {
    if (sankeyTreeStore.nodesFilter.diffing.universes.has(universeId)) {
        sankeyTreeStore.nodesFilter.diffing.universes.delete(universeId)
    } else {
        sankeyTreeStore.nodesFilter.diffing.universes.add(universeId)
    }
}
</script>

<template>
    <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Universes to display:</legend>

        <ToggleSwitch
            v-for="key in Object.keys(universesMetadata)"
            :id="key"
            :key="key"
            :value="universesMetadata[key].name"
            :checked="sankeyTreeStore.nodesFilter.diffing.universes.has(key)"
            @input="onUniverseSelectionChanged($event.target.id)"
        >
            <ColorLabel
                :label="universesMetadata[key].name"
                :color="universesMetadata[key].color"
            ></ColorLabel>
        </ToggleSwitch>

        <ToggleSwitch
            :id="UNMODIFIED"
            :value="UNMODIFIED"
            :checked="sankeyTreeStore.nodesFilter.diffing.showUnmodified"
            @input="sankeyTreeStore.setShowUnmodified($event.target.checked)"
        >
            <ColorLabel label="unmodified packages" :color="COLOR_UNMODIFIED"></ColorLabel>
        </ToggleSwitch>

        <ColorLabel label="modified packages" :color="COLOR_MODIFIED"></ColorLabel>
    </fieldset>
</template>
