<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Filter } from '../../ts/SharedTypes/Filters'
import { OptionHTMLAttributes, ref } from 'vue'

const store = useGlobalStore()
const defaultOption = ref<OptionHTMLAttributes>()

function removeItem(event: Event) {
    const selectedItem = (event.target as HTMLSelectElement).value
    if (selectedItem === 'Clear-All') {
        store.selections.clear()
        // Only clickable when element already exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        defaultOption.value!.selected = true
    }
    store.selections.delete(selectedItem)
}
</script>

<template>
    <div class="w-full flex">
        <select class="dropdown dropdown-white w-full" @change="removeItem">
            <option ref="defaultOption" value="" selected>Currently Selecting</option>
            <option value="" disabled>Click to delete from selection</option>
            <option value="Clear-All">Clear</option>
            <option v-for="selection in store.selections" :key="selection" :value="selection">
                {{ selection }}
            </option>
        </select>
        <button
            title="Add as Filter"
            class="btn-sm bg-transparent hover:bg-gray-500 text-gray-500 font-semibold hover:text-white py-2 border border-gray-300 hover:border-transparent rounded-full mx-1"
            @click="store.addFilter(Filter.fromSelection(store.selections))"
        >
            <font-awesome-icon icon="plus" />
        </button>
    </div>
</template>
