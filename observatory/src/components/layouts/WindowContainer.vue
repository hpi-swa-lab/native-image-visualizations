<script setup lang="ts">
import { ref } from 'vue'
import { EventType } from '../../ts/enums/EventType'

const emit = defineEmits([EventType.CLOSE_WINDOW])

const container = ref()

const posX = ref(0)
const posY = ref(0)

function dragMouseDown(e: MouseEvent) {
    e.preventDefault()

    posX.value = e.clientX
    posY.value = e.clientY

    container.value.onmousemove = elementDrag
}

function elementDrag(e: MouseEvent) {
    e.preventDefault()

    const pos1 = posX.value - e.clientX
    const pos2 = posY.value - e.clientY
    posX.value = e.clientX
    posY.value = e.clientY

    container.value.style.top = container.value.offsetTop - pos2 + 'px'
    container.value.style.left = container.value.offsetLeft - pos1 + 'px'
}

function closeDragElement() {
    container.value.onmousemove = null
}
</script>

<template>
    <div
        @mousedown="dragMouseDown"
        @mouseup="closeDragElement"
        ref="container"
        class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto h-full"
    >
        <div class="relative w-full h-full max-w-2xl">
            <div class="relative bg-white rounded-lg shadow">
                <div class="flex items-start justify-between p-4 border-b rounded-t">
                    <slot name="header" />
                    <button class="btn-sm btn-danger" @click="emit(EventType.CLOSE_WINDOW)">
                        <font-awesome-icon icon="xmark" />
                    </button>
                </div>
                <div class="p-6 space-y-6">
                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>
