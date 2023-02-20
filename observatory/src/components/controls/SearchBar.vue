<script setup lang="ts">
import { globalConfigStore } from '../../ts/stores'

const store = globalConfigStore()
let typingTimer: string | number | NodeJS.Timeout | undefined

function searchChanged(event: Event): void {
    if (!event.target) return

    const input = event.target as HTMLInputElement
    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => store.changeSearch(input.value), 500)
}
</script>

<template>
    <div>
        <label for="default-search">Search</label>
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
            <input
                ref="searchText"
                type="search"
                class="p-4 pl-10 w-full"
                placeholder="Search nodes"
                :value="store.search"
                required
                @input="searchChanged"
            />
        </div>
    </div>
</template>
