<script setup lang="ts">
import { SortingOption, SortingOrder } from '../../ts/enums/Sorting.js'
import {sankeyTreeConfigStore} from "../../ts/stores";

const sankeyTreeStore = sankeyTreeConfigStore()
const isSortedAscending = sankeyTreeStore.nodesFilter.sorting.order === SortingOrder.ASCENDING
</script>

<template>
    <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Node Sorting:</legend>

        <div>
            <template v-for="(option, index) in Object.values(SortingOption)" :key="index">
                <div class="relative block">
                    <input
                        :id="option"
                        name="sorting-options"
                        :value="option"
                        type="radio"
                        :checked="option === sankeyTreeStore.nodesFilter.sorting.option"
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
                    @change="sankeyTreeStore.setSortingOrder(isSortedAscending ? SortingOrder.ASCENDING : SortingOrder.DESCENDING)"
                />
                {{ SortingOrder.ASCENDING }}
            </label>
        </div>
    </fieldset>
</template>
