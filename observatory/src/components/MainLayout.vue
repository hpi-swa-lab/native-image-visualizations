<script setup lang="ts">
import VisualizationNavigation from './navigation/VisualizationNagivation.vue'

defineProps({
    title: String,
    visualizationType: Number
})

const emit = defineEmits<{
    (e: 'change-viz', value: number): void
}>()

function handleChangeViz(value: number) {
    console.log('mainLayout', value, typeof value)
    emit('change-viz', value)
}
</script>

<template>
    <aside class="w-64 z-1 h-full">
        <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4">
            <h2>{{ title }}</h2>
            <hr />
            <!-- TODO button that redirect to datamanager-->

            <div><button type="button">WIP: Data Manager</button></div>
            <hr />

            <!-- TODO auflistung der files, die im local storage liegen -->
            <VisualizationNavigation
                :selected="visualizationType"
                @change-viz="handleChangeViz"
            ></VisualizationNavigation>
            <hr />

            <ul class="space-y-2">
                <slot name="controls"> Controls </slot>
            </ul>
        </div>
    </aside>
    <div class="w-full h-full">
        <slot />
    </div>
</template>
