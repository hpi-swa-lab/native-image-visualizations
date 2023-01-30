<script setup lang="ts">
import VisualizationNavigation from './navigation/VisualizationNagivation.vue'
import UniverseSelectionList from './controls/UniverseSelectionList.vue'
import { EventType } from '../ts/enums/EventType'
import { PageType } from '../ts/enums/PageType'

withDefaults(
    defineProps<{
        title: string
        pageType: PageType
    }>(),
    {
        title: '',
        pageType: PageType.None
    }
)

const emit = defineEmits([EventType.CHANGE_PAGE])
</script>

<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1 h-full">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>

                <hr />

                <div class="space-y-4">
                    <button
                        v-if="pageType !== PageType.Home"
                        type="button"
                        class="btn btn-primary"
                        @click="emit(EventType.CHANGE_PAGE, PageType.Home)"
                    >
                        Home
                    </button>
                    <button
                        v-if="pageType !== PageType.DataManager"
                        type="button"
                        class="btn btn-primary"
                        @click="emit(EventType.CHANGE_PAGE, PageType.DataManager)"
                    >
                        Data Manager
                    </button>
                </div>
                <hr />

                <VisualizationNavigation
                    :selected="pageType"
                    @change-viz="$emit(EventType.CHANGE_PAGE, $event)"
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
