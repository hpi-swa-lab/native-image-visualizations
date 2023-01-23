<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1 h-full">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50 space-y-4">
                <h2> {{title}} </h2>

                <slot name="data-manager"> Data Manager</slot>
                <hr />

                <VisualizationNavigation></VisualizationNavigation>
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

<script setup lang="ts">
import VisualizationNavigation from "./VisualizationNagivation.vue";

defineProps({
  title: String
})
</script>
