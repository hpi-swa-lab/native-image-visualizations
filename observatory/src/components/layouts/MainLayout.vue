<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../controls/SearchBar.vue'
import TabLayout from './TabLayout.vue'
import DataManager from '../controls/DataManager.vue'
import LayerSelection from '../controls/LayerSelection.vue'
import { computed } from 'vue'

import { globalConfigStore } from '../../ts/stores'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)

const store = globalConfigStore()

const collapsed = computed(() => {
    return store.sidebarCollapsed
})
</script>

<template>
    <div class="w-full h-full flex flex-row">
        <div
            class="drop-shadow-xl overflow-y-scroll"
            :class="collapsed ? 'min-w-0' : 'min-w-[300px]'"
        >
            <div class="rounded bg-gray-50 space-y-4 h-full">
                <h2 class="text-center">{{ title }}</h2>

                <TabLayout
                    :selected-index="0"
                    :tab-names="['controls', 'data-manager']"
                    :button-names="['Controls', 'Data Manager']"
                >
                    <template #tab-content-controls>
                        <div class="px-3 py-4 space-y-4 h-full w-full">
                            <VisualizationNavigation />
                            <hr />

                            <UniverseSelectionList />
                            <hr />

                            <SearchBar />
                            <LayerSelection />

                            <ul class="space-y-2">
                                <slot name="controls"></slot>
                            </ul>
                        </div>
                    </template>
                    <template #tab-content-data-manager>
                        <DataManager class="px-3 py-4 h-full w-full" />
                    </template>
                </TabLayout>
            </div>
        </div>
        <div class="h-full w-full overflow-y-auto"><slot /></div>
    </div>
</template>
