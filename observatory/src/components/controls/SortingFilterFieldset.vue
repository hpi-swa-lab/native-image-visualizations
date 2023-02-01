<script setup lang="ts">
import { SortingOption, SortingOrder } from '../../ts/enums/Sorting.js'
import { EventType } from '../../ts/enums/EventType.js'

const props = withDefaults(
    defineProps<{
        sortingOption: SortingOption
        sortingOrder: SortingOrder
    }>(),
    {
        sortingOption: SortingOption.NAME,
        sortingOrder: SortingOrder.ASCENDING
    }
)

const isSortedAscending = props.sortingOrder === SortingOrder.ASCENDING
</script>

<template>
    <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Node Sorting:</legend>

        <!--        TODO #39 check defaults-->
        <div>
            <template v-for="(option, index) in Object.values(SortingOption)" :key="index">
                <div class="relative block">
                    <input
                        :id="option"
                        name="sorting-options"
                        :value="option"
                        type="radio"
                        :checked="option === sortingOption"
                        @change="$emit(EventType.SORTING_OPTION_CHANGED, option)"
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
                        $emit(
                            EventType.SORTING_ORDER_CHANGED,
                            isSortedAscending ? SortingOrder.ASCENDING : SortingOrder.DESCENDING
                        )
                    "
                />
                {{ SortingOrder.ASCENDING }}
            </label>
        </div>
    </fieldset>
</template>
