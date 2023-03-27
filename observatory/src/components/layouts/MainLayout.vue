<script setup lang="ts">
import VisualizationNavigation from '../controls/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../simpleUiElements/SearchBar.vue'
import TabLayout from './TabLayout.vue'
import DataManager from '../controls/DataManager.vue'
import FilteringOptions from '../controls/FilteringOptions.vue'
import SelectionList from '../controls/SelectionList.vue'
import { onMounted, ref } from 'vue'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { SwappableComponentType, componentName } from '../../ts/enums/SwappableComponentType'
import HelpDialog from '../help/HelpDialog.vue'
import WindowContainer from './WindowContainer.vue'
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)

const store = useGlobalStore()

const helpButton = ref<HTMLButtonElement>()
const collapsed = ref(false)
const selectedIndex = ref(store.currentComponent === SwappableComponentType.Home ? 1 : 0)

function toggleSidebarCollapse(): void {
    collapsed.value = !collapsed.value
}

onMounted(() => {
    if (!localStorage.getItem('helpDialogDismissed')) {
        const wantsHelp = confirm(
            'It seems you did not visit this tool yet. Do you want to get a tour?'
        )
        localStorage.setItem('helpDialogDismissed', 'yes')
        if (wantsHelp) {
            helpButton.value?.click()
        } else {
            alert('Okay. You can always access the help via the question mark button on the left')
        }
    }
})

const showHelp = ref(false)

function openHelp() {
    showHelp.value = true
}

function closeHelp() {
    showHelp.value = false
}
</script>

<template>
    <div class="w-full h-full flex flex-row">
        <div
            class="shrink-0 transition-[width] drop-shadow-xl overflow-y-scroll rounded bg-gray-50 space-y-4 h-auto min-h-full"
            :class="collapsed ? 'w-0' : 'w-[320px]'"
        >
            <div class="flex p-4 space-x-4 justify-even">
                <button class="bg-transparent btn-primary p-2 px-3 rounded" @click="openHelp()">
                    <font-awesome-icon icon="circle-question" />
                </button>
                <h2 class="col-start-3 text-center">{{ title }}</h2>
            </div>
            <TabLayout
                :selected-index="selectedIndex"
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
                        <SelectionList />
                        <FilteringOptions />

                        <ul class="space-y-2">
                            <slot name="controls"></slot>
                        </ul>
                    </div>
                </template>
                <template #tab-content-data-manager>
                    <DataManager
                        class="px-3 py-4 h-full w-full"
                        @config-loaded="() => (selectedIndex = 0)"
                    />
                </template>
            </TabLayout>
        </div>
        <button
            class="transition-[left] absolute bottom-[10px] z-10 btn bg-gray-50 mt-2 ml-2 hover:bg-gray-200 shadow-md"
            :class="collapsed ? 'left-0' : 'left-[300px]'"
            @click="toggleSidebarCollapse"
        >
            <font-awesome-icon
                icon="chevron-left"
                class="transition-[rotate]"
                :class="collapsed ? 'rotate-180' : ''"
            />
        </button>
        <div class="h-full w-full  overflow-y-auto">
            <WindowContainer v-if="showHelp" @close-window="closeHelp()">
                <template #header>Help for {{ componentName(store.currentComponent) }}</template>
                <HelpDialog />
            </WindowContainer>
            <slot />
        </div>
    </div>
</template>
