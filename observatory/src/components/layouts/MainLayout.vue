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
        <div class="col-span-2 drop-shadow-xl overflow-y-scroll min-w-[250px]">
            <div class="px-3 py-4 rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <TabLayout
                    class="space-y-4"
                    :selected-index="0"
                    :tab-names="['controls', 'data-manager']"
                >
                    <template #tab-content-controls>
                        <div class="space-y-4">
                            <button
                                v-if="
                                    globalStore.currentComponent ===
                                        SwappableComponentType.DataManager &&
                                    globalStore.previousComponent !== SwappableComponentType.Home
                                "
                                type="button"
                                class="btn btn-primary w-full"
                                @click="globalStore.switchToComponent(SwappableComponentType.Home)"
                            >
                                Home
                            </button>
                            <slot name="topButtons" />
                        </div>

                        <hr />

                        <VisualizationNavigation
                            v-if="
                                globalStore.currentComponent !== SwappableComponentType.DataManager
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
                    </template>
                    <template #tab-content-data-manager
                        ><button class="btn btn-primary w-full" @click="exportConfig">
                            <font-awesome-icon icon="fa-file-export" />
                            Export config
                        </button></template
                    >
                </TabLayout>
            </div>
        </div>
        <div class="col-span-10 h-full overflow-y-auto">
            <slot />
        </div>
    </div>
</template>
