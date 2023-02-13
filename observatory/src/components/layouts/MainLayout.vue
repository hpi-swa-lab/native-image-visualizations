<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'

withDefaults(
    defineProps<{
        title: string
        componentType: SwappableComponentType
    }>(),
    {
        title: '',
        componentType: SwappableComponentType.None
    }
)

const emit = defineEmits([EventType.CHANGE_PAGE])
</script>

<template>
    <div class="w-full h-full grid grid-cols-12 gap-2">
        <div class="col-span-2 drop-shadow-xl">
            <div class="px-3 py-4 rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <hr />

                <div class="space-y-4">
                    <button
                        v-if="componentType !== SwappableComponentType.Home"
                        type="button"
                        class="btn btn-primary"
                        @click="emit(EventType.CHANGE_PAGE, SwappableComponentType.Home)"
                    >
                        Home
                    </button>
                    <button
                        v-if="componentType !== SwappableComponentType.DataManager"
                        type="button"
                        class="btn btn-primary"
                        @click="emit(EventType.CHANGE_PAGE, SwappableComponentType.DataManager)"
                    >
                        Data Manager
                    </button>
                </div>

                <hr />

                <VisualizationNavigation
                    v-if="componentType !== SwappableComponentType.DataManager"
                    :selected="componentType"
                    @change-page="(componentNumber: SwappableComponentType) => {
                        emit(EventType.CHANGE_PAGE, componentNumber)
                    }"
                ></VisualizationNavigation>

                <hr v-if="componentType !== SwappableComponentType.DataManager" />

                <UniverseSelectionList
                    v-if="componentType !== SwappableComponentType.DataManager"
                />

                <hr v-if="componentType !== SwappableComponentType.DataManager" />

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
