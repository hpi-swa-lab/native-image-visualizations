<script setup lang="ts">
import { ref } from 'vue'
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from '../simpleUiElements/ToggleSwitch.vue'

const expanded = ref(false)
const store = useGlobalStore()

function toggleDropdown() {
    const menu = document.querySelector('[role="menu"]') as HTMLDivElement
    expanded.value = !expanded.value
    menu.classList.toggle('hidden')
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
                class="overflow-x-scroll w-full absolute right-0 z-10 mt-2 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                role="menu"
                aria-labelledby="menu-button"
            >
                <div v-for="(filter, index) in store.filters" :key="index" class="py-2 px-2">
                    <div class="flex flex-nowrap">
                        <ToggleSwitch
                            :id="filter.description"
                            :value="false"
                            :checked="store.isFilterActive(filter, false)"
                            role="menuitem"
                            @change.self="store.toggleFilter(filter, $event)"
                        />
                        <label class="text-sm whitespace-nowrap" :for="filter.description">{{
                            filter.description
                        }}</label>
                        <button
                            v-if="filter.isCustom"
                            class="btn-xs rounded px-2 my-1 text-xs ml-5 btn-danger"
                            @click="() => store.removeFilter(filter)"
                        >
                            <font-awesome-icon icon="xmark" />
                        </button>
                    </div>
                    <div class="flex flex-nowrap">
                        <ToggleSwitch
                            :id="filter.description"
                            :value="true"
                            :checked="store.isFilterActive(filter, true)"
                            class="text-xs"
                            role="menuitem"
                            @change.self="store.toggleFilter(filter, $event)"
                        >
                        </ToggleSwitch>
                        <label
                            class="text-gray-500 text-xs whitespace-nowrap"
                            :for="filter.description"
                        >
                            {{ 'All but ' + filter.description }}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
