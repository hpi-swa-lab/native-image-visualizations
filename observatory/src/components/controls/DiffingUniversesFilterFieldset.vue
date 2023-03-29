<script setup lang="ts">
import ColorLabel from '../simpleUiElements/ColorLabel.vue'
import ToggleSwitch from '../simpleUiElements/ToggleSwitch.vue'
import { useSankeyStore } from '../../ts/stores/sankeyTreeStore'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { UNMODIFIED } from '../../ts/Visualizations/SankeyTree'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import { computed } from 'vue'

defineProps<{
    universesMetadata: UniverseMetadata
}>()

const globalStore = useGlobalStore()
const sankeyStore = useSankeyStore()

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
            :value="universesMetadata[parseInt(key)].name"
            :checked="sankeyStore.isUniverseFiltered(parseInt(key))"
            :disabled="!isRealMultiverse || isTheOnlyCheckedOption(key)"
            @input="sankeyStore.changeUniverseSelection(parseInt($event.target.id))"
        >
            <ColorLabel
                :for-element="key"
                :label="'excl. in ' + universesMetadata[parseInt(key)].name"
                :color="universesMetadata[parseInt(key)].color"
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
                    label="shared, no excl. items on branch"
                    :color="sankeyStore.colorUnmodified"
                ></ColorLabel>
            </ToggleSwitch>

            <ColorLabel
                label="shared w/ excl. items on branch"
                :color="sankeyStore.colorModified"
                class="ml-[29px]"
            ></ColorLabel>
        </template>
    </fieldset>
</template>
