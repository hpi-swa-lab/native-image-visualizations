<script setup lang="ts">
import AlertBox from './AlertBox.vue'
import SortingFilterFieldset from './SortingFilterFieldset.vue'
import { NodesFilter } from '../../ts/SharedTypes/NodesFilter'
import { EventType } from '../../ts/enums/EventType.js'
import DiffingUniversesFilterFieldset from './DiffingUniversesFilterFieldset.vue'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import { DEFAULT_NODES_FILTER } from '../../ts/constants/SankeyTreeConstants'

const SHORTCUTS = ['shift+click on node expands branch']

const props = withDefaults(
    defineProps<{
        universesMetadata: Record<number, UniverseProps>
        nodesFilter: NodesFilter
    }>(),
    {
        universesMetadata: () => ({}),
        nodesFilter: () => DEFAULT_NODES_FILTER
    }
)

const emit = defineEmits([EventType.UPDATE])

function getNodesFilter() {
    return props.nodesFilter
}

function onUpdate(e: MouseEvent): void {
    e.preventDefault()
    emit(EventType.UPDATE, getNodesFilter())
}
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container">
        <form>
            <b>Controls</b>

            <DiffingUniversesFilterFieldset
                :diffing-filter="nodesFilter.diffing"
                :universes-metadata="universesMetadata"
                @show-unmodified-changed="getNodesFilter().diffing.showUnmodified = $event"
                @selection-changed="getNodesFilter().diffing.universes = $event"
            ></DiffingUniversesFilterFieldset>

            <SortingFilterFieldset
                :sorting-order="nodesFilter.sorting.order"
                :sorting-option="nodesFilter.sorting.option"
                @sorting-order-changed="getNodesFilter().sorting.order = $event"
                @sorting-option-changed="getNodesFilter().sorting.option = $event"
            ></SortingFilterFieldset>

            <button type="submit" class="btn btn-sm btn-primary m-2" @click="onUpdate($event)">
                update
            </button>

            <button
                id="expand-tree-btn"
                type="button"
                class="btn btn-light m-2"
                @click="$emit(EventType.EXPAND_TREE, $event)"
            >
                expand full tree
            </button>

            <AlertBox title="Shortcuts" :alert-infos="SHORTCUTS"></AlertBox>
        </form>
    </div>
</template>

<style scoped>
>>> input[type='color'] {
    @apply p-0 border-none;
}
</style>
