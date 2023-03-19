<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Filter } from '../../ts/SharedTypes/Filters'

const store = useGlobalStore()

function removeItem(event: Event) {
    const selectedItem = (event.target as HTMLSelectElement).value
    store.selections.delete(selectedItem)
}
</script>

<template>
    <div class="w-full flex content-start grid grid-cols-8">
        <select class="dropdown dropdown-white w-full col-span-6" @change="removeItem">
            <option value="" selected>Currently Selecting</option>
            <option value="" disabled>Click to delete from selection</option>
            <option v-for="selection in store.selections" :key="selection" :value="selection">
                {{ selection }}
            </option>
        </select>
        <button
            title="Clear all"
            class="btn-sm rounded btn-danger bg-white py-2 rounded-full"
            @click="() => store.selections.clear()"
        >
            <font-awesome-icon icon="xmark" />
        </button>
        <button
            title="Add as Filter"
            class="btn-sm bg-transparent hover:bg-gray-500 text-gray-500 font-semibold hover:text-white py-2 border border-gray-300 hover:border-transparent rounded-full"
            @click="store.addFilter(Filter.fromSelection(store.selections))"
        >
            <font-awesome-icon icon="plus" />
        </button>
    </div>
</template>
