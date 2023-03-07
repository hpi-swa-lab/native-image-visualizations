<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../controls/SearchBar.vue'
import TabLayout from './TabLayout.vue'
import DataManager from '../controls/DataManager.vue'
import LayerSelection from '../controls/LayerSelection.vue'
import FilteringOptions from '../controls/FilteringOptions.vue'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)
</script>

<template>
    <div class="w-full h-full grid grid-cols-12 gap-2">
        <div class="col-span-2 drop-shadow-xl overflow-y-scroll min-w-[300px]">
            <div class="rounded h-auto min-h-full bg-gray-50 space-y-4 h-full">
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
                            <FilteringOptions />

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
        <div class="col-span-10 h-full overflow-y-auto"><slot /></div>
    </div>
</template>
