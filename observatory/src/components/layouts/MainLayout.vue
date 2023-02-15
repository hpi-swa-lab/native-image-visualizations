<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../controls/SearchBar.vue'
import TabLayout from './TabLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import {
    globalConfigStore,
    vennConfigStore,
    treeLineConfigStore,
    sankeyTreeConfigStore,
    causalityGraphConfigStore
} from '../../ts/stores'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)

const globalStore = globalConfigStore()

function exportConfig() {
    const data = {
        global: globalStore.toExportDict(),
        venn: vennConfigStore().toExportDict(),
        sankey: treeLineConfigStore().toExportDict(),
        treeLine: sankeyTreeConfigStore().toExportDict(),
        causalityGraph: causalityGraphConfigStore().toExportDict()
    }

    const dataString = `data:text/json;charset=utf-8, ${encodeURIComponent(JSON.stringify(data))}`

    const anchor = document.createElement('a')
    anchor.setAttribute('href', dataString)
    anchor.setAttribute('download', 'data-config.json')

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
}
</script>

<template>
    <div class="w-full h-full grid grid-cols-12 gap-2">
        <div class="col-span-2 drop-shadow-xl">
            <div class="rounded bg-gray-50 space-y-4 h-full">
                <h2 class="text-center">{{ title }}</h2>
                <hr />

                <TabLayout :selected-index="0" :tab-names="['controls', 'data-manager']">
                    <template #tab-content-controls>
                        <div class="px-3 py-4 space-y-4 h-full w-full">
                            <VisualizationNavigation
                                v-if="
                                    globalStore.currentComponent !==
                                    SwappableComponentType.DataManager
                                "
                            ></VisualizationNavigation>
                            <hr />

                            <SearchBar />
                            <hr />

                            <UniverseSelectionList />
                            <hr />

                            <ul class="space-y-2">
                                <slot name="controls"> Controls </slot>
                            </ul>
                        </div>
                    </template>
                    <template #tab-content-data-manager>
                        <div class="px-3 py-4 space-y-4 h-full w-full">
                            <button
                                class="btn btn-primary w-full justify-between"
                                @click="exportConfig"
                            >
                                <font-awesome-icon icon="fa-file-export" />
                                Export Config
                            </button>
                        </div>
                    </template>
                </TabLayout>
            </div>
        </div>
        <div class="col-span-10 h-full overflow-y-auto">
            <slot />
        </div>
    </div>
</template>
