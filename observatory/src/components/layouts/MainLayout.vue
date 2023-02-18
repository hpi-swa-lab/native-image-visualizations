<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import SearchBar from '../controls/SearchBar.vue'
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
                <hr />

                <div class="flex flex-row justify-between">
                    <button
                        v-if="
                            globalStore.currentComponent === SwappableComponentType.DataManager &&
                            globalStore.previousComponent !== undefined
                        "
                        class="btn btn-primary mr-2"
                        :title="'go back to ' + globalStore.previousComponentName"
                        @click="globalStore.goToPreviousComponent()"
                    >
                        <font-awesome-icon icon="fa-arrow-left" />
                    </button>

                    <button
                        v-if="
                            globalStore.currentComponent === SwappableComponentType.DataManager &&
                            globalStore.previousComponent !== SwappableComponentType.Home
                        "
                        type="button"
                        class="btn btn-primary flex-auto"
                        @click="globalStore.switchToComponent(SwappableComponentType.Home)"
                    >
                        Home
                    </button>
                    <button
                        v-if="globalStore.currentComponent !== SwappableComponentType.DataManager"
                        type="button"
                        class="btn btn-primary flex-auto"
                        @click="globalStore.switchToComponent(SwappableComponentType.DataManager)"
                    >
                        Data Manager
                    </button>

                    <button
                        class="btn btn-primary ml-2"
                        title="export config"
                        @click="exportConfig"
                    >
                        <font-awesome-icon icon="fa-file-export" />
                    </button>
                    <slot name="topButtons" />
                </div>

                <hr />

                <VisualizationNavigation
                    v-if="globalStore.currentComponent !== SwappableComponentType.DataManager"
                ></VisualizationNavigation>
                <hr v-if="globalStore.currentComponent !== SwappableComponentType.DataManager" />

                <SearchBar />
                <hr />

                <UniverseSelectionList
                    v-if="globalStore.currentComponent !== SwappableComponentType.DataManager"
                />
                <hr v-if="globalStore.currentComponent !== SwappableComponentType.DataManager" />

                <button class="btn btn-primary w-full" @click="exportConfig">Export config</button>
                <hr />

                <ul class="space-y-2">
                    <slot name="controls"> Controls </slot>
                </ul>
            </div>
        </div>
        <div class="col-span-10 h-full overflow-y-auto">
            <slot />
        </div>
    </div>
</template>
