<script setup lang="ts">
import {
    COLOR_MODIFIED,
    COLOR_UNMODIFIED,
    UNMODIFIED
} from '../../ts/constants/SankeyTreeConstants'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import ColorLabel from '../simpleUiElements/ColorLabel.vue'
import ToggleSwitch from '../simpleUiElements/ToggleSwitch.vue'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'

defineProps<{
    universesMetadata: Record<string, UniverseProps>
}>()

const sankeyTreeStore = useSankeyStore()
</script>

<template>
    <fieldset class="w-auto">
        <label class="block">Universe nodes to display:</label>

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
            <ColorLabel
                :for-element="UNMODIFIED"
                label="unmodified packages"
                :color="COLOR_UNMODIFIED"
            ></ColorLabel>
        </ToggleSwitch>

        <ColorLabel
            label="modified packages"
            :color="COLOR_MODIFIED"
            class="ml-[29px]"
        ></ColorLabel>
    </fieldset>
</template>
