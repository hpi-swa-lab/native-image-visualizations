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
import { DiffingUniversesFilter } from '../../ts/SharedTypes/NodesFilter'
import { EventType } from '../../ts/enums/EventType'

const props = defineProps({
    diffingFilter: {
        type: Object as PropType<DiffingUniversesFilter>,
        required: true
    },
    universesMetadata: {
        type: Object as PropType<Record<string, UniverseProps>>,
        required: true
    }
})

const emit = defineEmits([EventType.SELECTION_CHANGED, EventType.SHOW_UNMODIFIED_CHANGED])

function onUniverseSelectionChanged(universeId: string) {
    if (props.diffingFilter.universes.has(universeId)) {
        props.diffingFilter.universes.delete(universeId)
    } else {
        props.diffingFilter.universes.add(universeId)
    }

    emit(EventType.SELECTION_CHANGED, props.diffingFilter.universes)
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
            :checked="diffingFilter.universes.has(key)"
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
            :checked="props.diffingFilter.showUnmodified"
            @input="$emit(EventType.SHOW_UNMODIFIED_CHANGED, $event.target.checked)"
        >
            <ColorLabel label="unmodified packages" :color="COLOR_UNMODIFIED"></ColorLabel>
        </ToggleSwitch>

        <ColorLabel label="modified packages" :color="COLOR_MODIFIED"></ColorLabel>
    </fieldset>
</template>

<style scoped></style>
