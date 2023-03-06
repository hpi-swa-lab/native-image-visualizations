<script setup lang="ts">
import { emptyObject } from '@jest/expect-utils';
import { EventType } from '../../ts/enums/EventType.js'
import { vennConfigStore } from '../../ts/stores';
import { SortingOrder } from '../../ts/enums/Sorting';

const emit = defineEmits(['ascending', 'descending'])
const vennStore = vennConfigStore()

</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container space-y-4">
        <div>
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
    </div>
</template>
