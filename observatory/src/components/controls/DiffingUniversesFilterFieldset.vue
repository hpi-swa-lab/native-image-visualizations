<script setup lang="ts">
import ColorLabel from './ColorLabel.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { globalConfigStore, sankeyTreeConfigStore } from '../../ts/stores'
import { UNMODIFIED } from '../../ts/Visualizations/SankeyTree'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import { computed } from 'vue'

defineProps<{
    universesMetadata: UniverseMetadata
}>()

const globalStore = globalConfigStore()
const sankeyStore = sankeyTreeConfigStore()

const isTheOnlyCheckedOption = computed(
    () => (key: string) => onlyShowUnmodifiedChecked(key) || onlyOneUniverseChecked(key)
)

const onlyShowUnmodifiedChecked = (key: string) =>
    sankeyStore.diffingFilter.showUnmodified &&
    sankeyStore.diffingFilter.universes.size === 0 &&
    key === UNMODIFIED

const onlyOneUniverseChecked = (key: string) =>
    !sankeyStore.diffingFilter.showUnmodified &&
    sankeyStore.diffingFilter.universes.size === 1 &&
    sankeyStore.isUniverseFiltered(parseInt(key))

const isRealMultiverse = computed(() => globalStore.multiverse.sources.length === 2)
</script>

<template>
    <fieldset class="w-auto">
        <label class="block">Universe nodes to display:</label>

        <ToggleSwitch
            v-for="key in Object.keys(universesMetadata)"
            :id="key"
            :key="key"
            :value="universesMetadata[key].name"
            :checked="sankeyStore.isUniverseFiltered(parseInt(key))"
            :disabled="!isRealMultiverse || isTheOnlyCheckedOption(key)"
            @input="sankeyStore.changeUniverseSelection(parseInt($event.target.id))"
        >
            <ColorLabel
                :for-element="key"
                :label="universesMetadata[key].name"
                :color="universesMetadata[key].color"
            ></ColorLabel>
        </ToggleSwitch>

        <template v-if="isRealMultiverse">
            <ToggleSwitch
                :id="UNMODIFIED"
                :value="UNMODIFIED"
                :checked="sankeyStore.diffingFilter.showUnmodified"
                :disabled="isTheOnlyCheckedOption(UNMODIFIED)"
                @input="sankeyStore.setShowUnmodified($event.target.checked)"
            >
                <ColorLabel
                    :for-element="UNMODIFIED"
                    label="unmodified packages"
                    :color="sankeyStore.colorUnmodified"
                ></ColorLabel>
            </ToggleSwitch>

            <ColorLabel
                label="modified packages"
                :color="sankeyStore.colorModified"
                class="ml-[29px]"
            ></ColorLabel>
        </template>
    </fieldset>
</template>
