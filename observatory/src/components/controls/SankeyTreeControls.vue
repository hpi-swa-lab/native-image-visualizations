<script setup lang="ts">
import AlertBox from './AlertBox.vue'
import SortingFilterFieldset from './SortingFilterFieldset.vue'
import DiffingUniversesFilterFieldset from './DiffingUniversesFilterFieldset.vue'
import { UniverseMetadata } from '../../ts/SharedTypes/SankeyTree'
import LayerSelection from './LayerSelection.vue'
import SearchBar from './../simpleUiElements/SearchBar.vue'
import SelectionList from './SelectionList.vue'
import FilteringOptions from './FilteringOptions.vue'

const SHORTCUTS = [
    '* shift+click on node expands branch',
    '* ctrl+click on node de-/selects it (command+click on Mac)'
]

withDefaults(
    defineProps<{
        universesMetadata: UniverseMetadata
    }>(),
    {
        universesMetadata: () => ({})
    }
)
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container space-y-4">
        <SearchBar />
        <SelectionList />
        <FilteringOptions />
        <LayerSelection />

        <DiffingUniversesFilterFieldset
            :universes-metadata="universesMetadata"
        ></DiffingUniversesFilterFieldset>

        <SortingFilterFieldset />
        <AlertBox title="Shortcuts" :alert-infos="SHORTCUTS"></AlertBox>
    </div>
</template>
