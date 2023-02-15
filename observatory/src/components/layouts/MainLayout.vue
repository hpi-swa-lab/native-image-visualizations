<script setup lang="ts">
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { globalConfigStore } from '../../ts/configStore'

withDefaults(
    defineProps<{
        title: string
    }>(),
    {
        title: ''
    }
)

const store = globalConfigStore()
</script>

<template>
    <div class="w-full h-full grid grid-cols-12 gap-2">
        <div class="col-span-2 drop-shadow-xl">
            <div class="px-3 py-4 rounded bg-gray-50 space-y-4 h-full">
                <h2>{{ title }}</h2>
                <hr />

                <div class="space-y-4">
                    <button
                        v-if="
                            store.currentComponent === SwappableComponentType.DataManager &&
                            store.previousComponent !== SwappableComponentType.Home
                        "
                        type="button"
                        class="btn btn-primary w-full"
                        @click="store.switchToComponent(SwappableComponentType.Home)"
                    >
                        Home
                    </button>
                    <button
                        v-if="store.currentComponent !== SwappableComponentType.DataManager"
                        type="button"
                        class="btn btn-primary w-full"
                        @click="store.switchToComponent(SwappableComponentType.DataManager)"
                    >
                        Data Manager
                    </button>
                    <button
                        v-if="
                            store.currentComponent === SwappableComponentType.DataManager &&
                            store.previousComponent !== undefined
                        "
                        class="btn btn-primary w-full"
                        @click="store.goToPreviousComponent()"
                    >
                        Go back to {{ store.previousComponentName }}
                    </button>
                    <slot name="topButtons" />
                </div>

                <hr />

                <VisualizationNavigation
                    v-if="store.currentComponent !== SwappableComponentType.DataManager"
                ></VisualizationNavigation>

                <hr v-if="store.currentComponent !== SwappableComponentType.DataManager" />

                <UniverseSelectionList
                    v-if="store.currentComponent !== SwappableComponentType.DataManager"
                />

                <hr v-if="store.currentComponent !== SwappableComponentType.DataManager" />

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
