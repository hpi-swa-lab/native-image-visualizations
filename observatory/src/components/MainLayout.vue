<script setup lang="ts">
import VisualizationNavigation from './navigation/VisualizationNagivation.vue'
import UniverseSelectionList from './controls/UniverseSelectionList.vue'
import { EventType } from '../ts/enums/EventType'
import { VisualizationType } from '../ts/enums/VisualizationType'

withDefaults(
    defineProps<{
        title: string
        visualizationType: VisualizationType
    }>(),
    {
        title: '',
        visualizationType: VisualizationType.None
    }
)

const emit = defineEmits([EventType.CHANGE_VIZ, EventType.EXPORT_CONFIG])
</script>

<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1 h-full">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <hr />

                <button class="btn btn-primary w-full">WIP: Data Manager</button>
                <hr />

                <VisualizationNavigation
                    :selected="visualizationType"
                    @change-viz="$emit(EventType.CHANGE_VIZ, $event)"
                ></VisualizationNavigation>
                <hr />

                <UniverseSelectionList></UniverseSelectionList>
                <hr />

                <button class="btn btn-primary w-full">Export config</button>
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
