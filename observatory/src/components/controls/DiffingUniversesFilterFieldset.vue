<script setup lang="ts">
import ColorLabel from './ColorLabel.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import {sankeyTreeConfigStore} from '../../ts/stores'
import {UNMODIFIED} from '../../ts/Visualizations/SankeyTree';
import {UniverseMetadata} from '../../ts/SharedTypes/SankeyTree';

defineProps<{
    universesMetadata: UniverseMetadata
}>()

const sankeyTreeStore = sankeyTreeConfigStore()
</script>

<template>
    <fieldset class="w-auto">
        <label class="block">Universe nodes to display:</label>

        <ToggleSwitch
            v-for="key in Object.keys(universesMetadata)"
            :id="key"
            :key="key"
            :value="universesMetadata[key].name"
            :checked="sankeyTreeStore.isUniverseFiltered(parseInt(key))"
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
                :color="sankeyTreeStore.colorUnmodified"
            ></ColorLabel>
        </ToggleSwitch>

        <ColorLabel
            label="modified packages"
            :color="sankeyTreeStore.colorModified"
            class="ml-[29px]"
        ></ColorLabel>
    </fieldset>
</template>
