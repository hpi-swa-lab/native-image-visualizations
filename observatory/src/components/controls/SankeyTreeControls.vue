<script setup lang="ts">
import AlertBox from './AlertBox.vue'
import SortingFilterFieldset from './SortingFilterFieldset.vue'
import { EventType } from '../../ts/enums/EventType.js'
import DiffingUniversesFilterFieldset from './DiffingUniversesFilterFieldset.vue'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'

const SHORTCUTS = ['shift+click on node expands branch']

withDefaults(
    defineProps<{
        universesMetadata: Record<number, UniverseProps>
    }>(),
    {
        universesMetadata: () => ({})
    }
)

const emit = defineEmits([EventType.CHANGE, EventType.EXPAND_TREE])

function onChange(event: MouseEvent): void {
    event.preventDefault()
    emit(EventType.CHANGE, event)
}
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container space-y-4">
        <form class="space-y-4 border rounded p-2">
            <DiffingUniversesFilterFieldset
                :universes-metadata="universesMetadata"
            ></DiffingUniversesFilterFieldset>

            <SortingFilterFieldset />

            <button type="submit" class="btn btn-sm btn-primary" @click="onChange">
                update
            </button>

            <button
                id="expand-tree-btn"
                type="button"
                class="btn btn-light m-2"
                @click="emit(EventType.EXPAND_TREE, $event)"
            >
                expand full tree
            </button>
        </form>

        <AlertBox title="Shortcuts" :alert-infos="SHORTCUTS"></AlertBox>
    </div>
</template>
