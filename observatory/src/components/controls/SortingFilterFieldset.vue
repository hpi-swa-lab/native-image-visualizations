<script setup lang="ts">
import { SortingOption, SortingOrder } from '../../ts/enums/Sorting.js'
import { sankeyTreeConfigStore } from '../../ts/stores/sankeyTreeConfigStoreigStore'

const sankeyTreeStore = sankeyTreeConfigStore()
const isSortedAscending = sankeyTreeStore.sortingFilter.order === SortingOrder.ASCENDING
</script>

<template>
    <fieldset class="w-auto">
        <label class="block">Node sorting:</label>

        <div>
            <template v-for="(option, index) in Object.values(SortingOption)" :key="index">
                <div class="relative block">
                    <input
                        :id="option"
                        name="sorting-options"
                        :value="option"
                        type="radio"
                        :checked="sankeyTreeStore.isFilteredSortingOption(option)"
                        @change="sankeyTreeStore.setSortingOption(option)"
                    />
                    <label :for="option" class="ml-1"> {{ option }} </label>
                </div>
            </template>
        </div>

        <div class="mt-2">
            <label>
                <input
                    v-model="isSortedAscending"
                    type="checkbox"
                    @change="
                        sankeyTreeStore.setSortingOrder(
                            isSortedAscending ? SortingOrder.ASCENDING : SortingOrder.DESCENDING
                        )
                    "
                />
                {{ SortingOrder.ASCENDING }}
            </label>
        </div>
    </fieldset>
</template>
