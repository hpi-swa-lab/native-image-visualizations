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

defineEmits([EventType.CHANGE_VIZ])
</script>

<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1 h-full">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <hr />

                <div>
                    <button type="button" class="btn btn-primary btn-primary:hover">
                        WIP: Data Manager
                    </button>
                </div>
                <hr />

                <VisualizationNavigation
                    :selected="visualizationType"
                    @change-viz="$emit(EventType.CHANGE_VIZ, $event)"
                ></VisualizationNavigation>
                <hr />

                <UniverseSelectionList></UniverseSelectionList>
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
