<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
    level: {
        type: Number,
        default: 2
    }
})
const shadowClass = computed(() => {
    switch (props.level) {
        case 1:
            return 'drop-shadow-md'
        case 2:
            return 'drop-shadow-lg'
        case 3:
            return 'drop-shadow-xl'
        case 4:
            return 'drop-shadow-2xl'
        default:
            return 'drop-shadow-md'
    }
})
</script>

<template>
    <div :class="`space-y-5 p-4 bg-white z-${props.level * 10} ${shadowClass}`">
        <slot />
    </div>
</template>
