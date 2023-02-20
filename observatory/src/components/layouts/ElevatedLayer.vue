<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(
    defineProps<{
        level: number
        ySpacing: number
    }>(),
    {
        level: 2,
        ySpacing: 5
    }
)
const shadowClass = computed(() => {
    switch (props.level) {
        case 1:
            return 'drop-shadow'
        case 2:
            return 'drop-shadow-md'
        case 3:
            return 'drop-shadow-lg'
        case 4:
            return 'drop-shadow-xl'
        case 5:
            return 'drop-shadow-2xl'
        default:
            return 'drop-shadow-md'
    }
})
</script>

<template>
    <div :class="`space-y-${props.ySpacing} p-4 bg-gray-100 z-${props.level * 10} ${shadowClass}`">
        <slot />
    </div>
</template>
