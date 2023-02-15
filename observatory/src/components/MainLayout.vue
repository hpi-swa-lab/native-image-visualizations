<script setup lang="ts">
import VisualizationNavigation from './navigation/VisualizationNagivation.vue'
import UniverseSelectionList from './controls/UniverseSelectionList.vue'
import {
    globalConfigStore,
    vennConfigStore,
    treeLineConfigStore,
    sankeyTreeConfigStore,
    causalityGraphConfigStore
} from '../ts/configStore'

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
        global: { ...globalStore.toExportDict() },
        venn: { ...vennConfigStore().toExportDict() },
        sankey: { ...treeLineConfigStore().toExportDict() },
        treeLine: { ...sankeyTreeConfigStore().toExportDict() },
        causalityGraph: { ...causalityGraphConfigStore().toExportDict() }
    }

    const dataString = `data:text/json;charset=utf-8, ${encodeURIComponent(JSON.stringify(data))}`

    const anchor = document.createElement('a')
    anchor.setAttribute('href', dataString)
    anchor.setAttribute('download', 'dataAndConfig.json')

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
}
</script>

<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1 h-full">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <hr />

                <button class="btn btn-primary w-full">WIP: Data Manager</button>
                <hr />

                <VisualizationNavigation></VisualizationNavigation>
                <hr />

                <UniverseSelectionList></UniverseSelectionList>
                <hr />

                <button class="btn btn-primary w-full" @click="exportConfig">Export config</button>
                <hr />

                <ul class="space-y-2">
                    <slot name="controls"> Controls </slot>
                </ul>
            </div>
        </aside>
        <div class="w-full h-full">
            <slot />
        </div>
    </div>
</template>
