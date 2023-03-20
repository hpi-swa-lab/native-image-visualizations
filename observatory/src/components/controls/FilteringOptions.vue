<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import ToggleSwitch from './ToggleSwitch.vue'

const store = useGlobalStore()
</script>

<template>
    <div class="overflow-auto w-full h-[250px] grid grid-cols-8 relative content-start">
        <p>All |</p>
        <p>None</p>
        <div class="col-start-1 w-fit">
            <template v-for="(filter, index) in store.filters" :key="index">
                <div class="flex">
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

                    <p class="whitespace-nowrap flex-1 flex-nowrap" :for="filter.description">
                        {{ filter.description }}
                    </p>
                    <button
                        v-if="filter.isCustom"
                        class="btn-sm rounded text-xs btn-danger bg-white sticky right-0 m-1"
                        @click="() => store.removeFilter(filter)"
                    >
                        <font-awesome-icon icon="xmark" />
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>
