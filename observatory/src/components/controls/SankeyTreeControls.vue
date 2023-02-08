<script setup lang="ts">
import type { PropType } from 'vue'

import AlertBox from './AlertBox.vue'
import SortingFilterFieldset from './SortingFilterFieldset.vue'
import { NodesFilter } from '../../ts/SharedTypes/NodesFilter'
import { SortingOption, SortingOrder } from '../../ts/enums/Sorting'
import { EventType } from '../../ts/enums/EventType.js'
import DiffingUniversesFilterFieldset from './DiffingUniversesFilterFieldset.vue'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import { COLOR_GREEN, COLOR_RED } from '../../ts/constants/ColorPalette'

const SHORTCUTS = ['shift+click on node expands branch']

// TODO #39 set {} default value for universeMetadata
// cannot use defaultWith() with Objects
const props = defineProps({
    universesMetadata: {
        type: Object as PropType<Record<number, UniverseProps>>,
        default: () => {
            return {
                '0': { name: 'Universe1', color: COLOR_RED },
                '1': { name: 'Universe2', color: COLOR_GREEN }
            }
        }
    },
    filter: {
        type: Object as PropType<NodesFilter>,
        default: () => {
            return {
                diffing: {
                    universes: new Set(['0', '1']),
                    showUnmodified: false
                },
                sorting: {
                    option: SortingOption.NAME,
                    order: SortingOrder.ASCENDING
                }
            }
        }
    }
})

function getFilter() {
    return props.filter
}

function onUpdate(e: MouseEvent): void {
    e.preventDefault()
    // TODO #39 emit filter object
}
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container">
        <form>
            <b>Controls</b>

            <DiffingUniversesFilterFieldset
                :diffing-filter="filter.diffing"
                :universes-metadata="universesMetadata"
                @show-unmodified-changed="getFilter().diffing.showUnmodified = $event"
                @selection-changed="getFilter().diffing.universes = $event"
            ></DiffingUniversesFilterFieldset>

            <SortingFilterFieldset
                :sorting-order="filter.sorting.order"
                :sorting-option="filter.sorting.option"
                @sorting-order-changed="getFilter().sorting.order = $event"
                @sorting-option-changed="getFilter().sorting.option = $event"
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
