<script setup lang="ts">

const yOffset = -70
const xOffSet = 20

withDefaults(
    defineProps<{
        content: string
        show: boolean,
        x: number,
        y: number
    }>(),
    {
        content: '',
        show: false,
        x: 0,
        y: 0
    }
)

</script>

<template>
    <div v-if="show" id="tooltip" class="border absolute pointer-events-none p-2 bg-white whitespace-pre-line opacity-90" :style="{ left: x + xOffSet + 'px', top: y + yOffset + 'px' }">
        {{ content }}
    </div>
</template>