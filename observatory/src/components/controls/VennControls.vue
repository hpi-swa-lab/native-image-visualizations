<script setup lang="ts">
import { vennConfigStore } from '../../ts/stores'
import { SortingOrder } from '../../ts/enums/Sorting'

const vennStore = vennConfigStore()
</script>

<template>
    <div id="venn-controls" class="input-container settings-container space-y-4">
        <label class="ml-1"> Sorting: </label>
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
</template>
