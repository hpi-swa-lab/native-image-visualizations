<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from '../simpleUiElements/ToggleSwitch.vue'

const store = useGlobalStore()
</script>

<template>
    <div class="overflow-auto w-full max-h-[250px] grid grid-cols-8 relative content-start">
        <p class="content-center">Only</p>
        <p class="content-center">None</p>
        <template v-for="(filter, index) in store.filters" :key="index">
            <ToggleSwitch
                :id="filter.description"
                class="col-start-1 content-center"
                :value="false"
                :checked="store.isFilterActive(filter, false)"
                role="menuitem"
                @change.self="store.toggleFilter(filter, $event)"
            />
            <ToggleSwitch
                :id="filter.description"
                class="content-center"
                :value="true"
                :checked="store.isFilterActive(filter, true)"
                role="menuitem"
                @change.self="store.toggleFilter(filter, $event)"
            />

            <p
                class="col-span-5 overflow-x-auto whitespace-nowrap flex-1 flex-nowrap"
                :for="filter.description"
            >
                {{ filter.description }}
            </p>
            <button
                v-if="filter.isCustom"
                class="content-center btn-sm rounded text-xs btn-danger bg-white sticky right-0 m-1"
                @click="() => store.removeFilter(filter)"
            >
                <font-awesome-icon icon="xmark" />
            </button>
        </template>
    </div>
</template>
