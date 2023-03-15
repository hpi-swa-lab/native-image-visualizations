<script setup lang="ts">
import { ref } from 'vue'
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from './ToggleSwitch.vue'

const expanded = ref(false)
const store = useGlobalStore()

function toggleDropdown() {
    const menu = document.querySelector('[role="menu"]') as HTMLDivElement
    expanded.value = !expanded.value
    menu.classList.toggle('hidden')
}
</script>

<template>
    <div
                class="overflow-x-scroll w-full right-0 my-2"
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
                        <ToggleSwitch
                            :id="filter.description"
                            :value="true"
                            :checked="store.isFilterActive(filter, true)"
                            role="menuitem"
                            @change.self="store.toggleFilter(filter, $event)"
                        />
                        <label class="whitespace-nowrap pt-1" :for="filter.description">{{
                            filter.description
                        }}</label>
                        <button
                            v-if="filter.isCustom"
                            class="btn-sm rounded my-1 mb-2 text-xs ml-5 btn-danger"
                            @click="() => store.removeFilter(filter)"
                        >
                            <font-awesome-icon icon="xmark" />
                        </button>
                    </div>
                </div>
            </div>
</template>
