<script setup lang="ts">
import { EventType } from '../../ts/enums/EventType'
import VueMarkdown from 'vue-markdown-render'

const emit = defineEmits([EventType.CLOSE_ABOUT])

const aboutText = `
# About Us
`
</script>

<template>
    <div class="relative bg-white h-full space-y-4 rounded-lg shadow">
        <div class="flex items-start justify-between p-4 border-b rounded-t drop-shadow-sm">
            <p>About Us</p>
            <button class="btn-sm btn-danger" @click="emit(EventType.CLOSE_ABOUT)">
                <font-awesome-icon icon="xmark" />
            </button>
        </div>
        <div class="h-[90%] overflow-y-auto p-4 space-y-4">
            <VueMarkdown :source="aboutText" />
        </div>
    </div>
</template>
