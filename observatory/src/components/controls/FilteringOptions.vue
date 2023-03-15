<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from './ToggleSwitch.vue'

const store = useGlobalStore()
</script>

<template>
    <div class="overflow-auto w-full h-[250px]">
        <label class="ml-1">All | None</label>
        <div v-for="(filter, index) in store.filters" :key="index">
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
                <div class="flex-1">
                    <label class="whitespace-nowrap pt-1" :for="filter.description">{{
                        filter.description
                    }}</label>
                </div>
                <button
                    v-if="filter.isCustom"
                    class="btn-sm rounded my-1 mb-2 text-xs ml-5 btn-danger bg-white sticky right-0"
                    @click="() => store.removeFilter(filter)"
                >
                    <font-awesome-icon icon="xmark" />
                </button>
            </div>
        </div>
    </div>
</template>
