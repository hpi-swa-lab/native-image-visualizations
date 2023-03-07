<script setup lang="ts">
import AlertBox from './AlertBox.vue'
import SortingFilterFieldset from './SortingFilterFieldset.vue'
import { EventType } from '../../ts/enums/EventType.js'
import DiffingUniversesFilterFieldset from './DiffingUniversesFilterFieldset.vue'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'

const SHORTCUTS = ['shift+click on node expands branch']

withDefaults(
    defineProps<{
        universesMetadata: UniverseMetadata
    }>(),
    {
        universesMetadata: () => ({})
    }
)

const emit = defineEmits([EventType.EXPAND_TREE])
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container space-y-4">
        <form class="space-y-4 border rounded p-2">
            <DiffingUniversesFilterFieldset
                :universes-metadata="universesMetadata"
            ></DiffingUniversesFilterFieldset>

            <SortingFilterFieldset />

            <!--            TODO maybe remove-->
            <button
                id="expand-tree-btn"
                type="button"
                class="btn btn-light"
                @click="emit(EventType.EXPAND_TREE, $event)"
            >
                expand full tree
            </button>
        </form>

        <AlertBox title="Shortcuts" :alert-infos="SHORTCUTS"></AlertBox>
    </div>
</template>
