<script setup lang="ts">
import { useVennStore } from '../../ts/stores/vennStore'
import { SortingOrder } from '../../ts/enums/Sorting'
import LayerSelection from './LayerSelection.vue'
import SearchBar from './../simpleUiElements/SearchBar.vue'
import SelectionList from './SelectionList.vue'
import FilteringOptions from './FilteringOptions.vue'

const vennStore = useVennStore()
</script>

<template>
    <div id="venn-controls" class="input-container settings-container space-y-4">
        <SearchBar />
        <SelectionList />
        <FilteringOptions />
        <LayerSelection />
        <div class="space-y-4">
            <label class="ml-1">Sorting:</label>
            <template v-for="(order, index) in Object.values(SortingOrder)" :key="index">
                <div class="relative block">
                    <input
                        :id="order"
                        name="sorting-options"
                        :value="order"
                        type="radio"
                        :checked="vennStore.isSortingOrder(order)"
                        @change="vennStore.setSortingOrder(order)"
                    />
                    <label :for="order" class="ml-1"> {{ order }} </label>
                </div>
            </template>
        </div>
    </div>
</template>
