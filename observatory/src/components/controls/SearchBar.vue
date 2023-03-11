<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Filter } from '../../ts/SharedTypes/Filters'

const store = useGlobalStore()
let typingTimer: string | number | NodeJS.Timeout | undefined

function searchChanged(event: Event): void {
    if (!event.target) return
    const input = event.target as HTMLInputElement
    clearTimeout(typingTimer)
    // Updating the basic search term immediately for being able to e.g. add filters without wait.
    // The wait before calculating a new highlights selection is more important in order
    // to avoid constant compute heavy operations like updating the visualizations
    store.basicChangeSearchTerm(input.value)
    typingTimer = setTimeout(() => {
        store.changeSearch(input.value)
    }, 1000)
}

function addFilter() {
    if (store.search.length === 0) return
    const newFilter = Filter.fromSearchTerm(store.search)
    if (store.addFilter(newFilter)) {
        store.toggleFilter(newFilter)
        store.changeSearch('')
    }
}
</script>

<template>
    <div>
        <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                    aria-hidden="true"
                    class="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                </svg>
            </div>
            <div class="w-full">
                <input
                    ref="searchText"
                    type="search"
                    class="pl-10"
                    placeholder="Search nodes"
                    :value="store.search"
                    required
                    @input="searchChanged"
                />
                <button
                    title="Add as Filter"
                    class="btn-sm bg-transparent hover:bg-gray-500 text-gray-500 font-semibold hover:text-white p-2 border border-gray-300 hover:border-transparent rounded-full"
                    @click="addFilter"
                >
                    <font-awesome-icon icon="plus" />
                </button>
            </div>
        </div>
    </div>
</template>
