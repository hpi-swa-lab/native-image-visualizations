<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
    level: {
        type: Number,
        default: 2
    }
})
const shadowClass = computed(() => {
    let result = 'drop-shadow-md'

    switch (props.level) {
        case 1:
            result = 'drop-shadow-md'
            break
        case 2:
            result = 'drop-shadow-lg'
            break
        case 3:
            result = 'drop-shadow-xl'
            break
        case 4:
            result = 'drop-shadow-2xl'
            break
    }

    return result
})
</script>

<template>
    <div :class="`space-y-5 p-4 bg-gray-100 z-${props.level * 10} ${shadowClass}`">
        <slot />
    </div>
</template>
