<script setup lang="ts">
import { computed } from 'vue'
import VisualizationNavigation from '../navigation/VisualizationNagivation.vue'
import UniverseSelectionList from '../controls/UniverseSelectionList.vue'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'

const props = withDefaults(
    defineProps<{
        title: string
        componentType: SwappableComponentType
        previousComponent?: SwappableComponentType | undefined
    }>(),
    {
        title: '',
        componentType: SwappableComponentType.None,
        previousComponent: undefined
    }
)

const emit = defineEmits([EventType.CHANGE_PAGE])

const previousComponentName = computed(() => {
    switch (props.previousComponent) {
        case SwappableComponentType.VennSets:
            return 'Venn Sets'
        case SwappableComponentType.SankeyTree:
            return 'Sankey Tree'
        case SwappableComponentType.TreeLine:
            return 'Tree Line'
        case SwappableComponentType.CausalityGraph:
            return 'Causality Graph'
        case SwappableComponentType.Home:
            return 'Home'
        default:
            return '<Error>'
    }
})
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
                            componentType === SwappableComponentType.DataManager &&
                            previousComponent !== SwappableComponentType.Home
                        "
                        type="button"
                        class="btn btn-primary w-full"
                        @click="emit(EventType.CHANGE_PAGE, SwappableComponentType.Home)"
                    >
                        Home
                    </button>
                    <button
                        v-if="componentType !== SwappableComponentType.DataManager"
                        type="button"
                        class="btn btn-primary w-full"
                        @click="emit(EventType.CHANGE_PAGE, SwappableComponentType.DataManager)"
                    >
                        Data Manager
                    </button>
                    <button
                        v-if="
                            componentType === SwappableComponentType.DataManager &&
                            previousComponent !== undefined
                        "
                        class="btn btn-primary w-full"
                        @click="emit(EventType.CHANGE_PAGE, previousComponent)"
                    >
                        Go back to {{ previousComponentName }}
                    </button>
                    <slot name="topButtons" />
                </div>

                <hr />

                <VisualizationNavigation
                    v-if="componentType !== SwappableComponentType.DataManager"
                    :selected="componentType"
                    @change-page="(componentType: SwappableComponentType) => {
                        emit(EventType.CHANGE_PAGE, componentType)
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
