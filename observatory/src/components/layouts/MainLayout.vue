<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../controls/SearchBar.vue'
import TabLayout from './TabLayout.vue'
import DataManager from '../controls/DataManager.vue'
import LayerSelection from '../controls/LayerSelection.vue'
import { ref } from 'vue'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)

const collapsed = ref(false)

function toggleSidebarCollapse(): void {
    collapsed.value = !collapsed.value
}
</script>

<template>
    <div class="w-full h-full flex flex-row">
        <div
            class="shrink-0 transition-[width] drop-shadow-xl overflow-y-scroll rounded bg-gray-50 space-y-4 h-full"
            :class="collapsed ? 'w-0' : 'w-[300px]'"
        >
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
        <button
            class="transition-[left] absolute top-0 z-10 btn btn-primary mt-4 ml-4 -rotate-90 drop-shadow-xl"
            :class="collapsed ? 'left-0' : 'left-[300px]'"
            @click="toggleSidebarCollapse"
        >
            <font-awesome-icon
                icon="chevron-right"
                class="transition-[rotate]"
                :class="collapsed ? 'rotate-90' : '-rotate-90'"
            />
        </button>
        <div class="h-full w-full overflow-y-auto"><slot /></div>
    </div>
</template>
