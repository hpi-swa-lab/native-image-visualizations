<script setup lang="ts">
import { globalConfigStore } from '../../ts/stores'
import ToggleSwitch from './ToggleSwitch.vue';

let expanded = false
const store = globalConfigStore()

function toggleDropdown() {
    const menu = document.querySelector('[role="menu"]') as HTMLDivElement
    if (!expanded) {
      menu.classList.remove('hidden')
      expanded = true
    } else {
      menu.classList.add('hidden')
      expanded = false
    }
}
</script>

<template>
    <div class="relative inline-block text-left w-full">
        <div>
            <button
                id="menu-button"
                type="button"
                class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                aria-expanded="true"
                aria-haspopup="true"
                @click="toggleDropdown"
            >
                Filters
                <svg
                    class="-mr-1 h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
            <div
                class="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
            >
                <div v-for="(filter, index) in store.filters" :key="index" class="py-2 px-2 w-full" role="none">
                    <ToggleSwitch
                        :id="filter.description"
                        :value="false"
                        :checked="store.isFilterActive(filter, false)"
                        role="menuitem"
                        @change.self="store.toggleFilter(filter, $event)"
                    >
                      <label class='text-sm' :for="filter.description"> {{ filter.description }} </label>
                    </ToggleSwitch>
                    <ToggleSwitch
                        :id="filter.description"
                        :value="true"
                        :checked="store.isFilterActive(filter, true)"
                        class="text-xs"
                        role="menuitem"
                        @change.self="store.toggleFilter(filter, $event)"
                    >
                      <label class='text-gray-500 text-xs' :for="filter.description"> {{ 'All but ' + filter.description }} </label>
                    </ToggleSwitch>
                </div>
            </div>
        </div>
    </div>
</template>
