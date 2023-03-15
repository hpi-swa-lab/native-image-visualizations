<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EventType } from '../../ts/enums/EventType'

const props = withDefaults(
    defineProps<{
        label: string
    }>(),
    {
        label: ''
    }
)

const emit = defineEmits([EventType.CHANGE])

const label = computed(() => props.label)
watch(label, () => {
    reset()
})

const inputElement = ref<HTMLInputElement>()
const inputValue = ref(props.label)

const isEditEnabled = ref<boolean>(false)

function onInputUpdate() {
    isEditEnabled.value = false
    emit(EventType.CHANGE, inputValue.value)
}
function toggleEdit() {
    isEditEnabled.value = true
    nextTick(() => {
        if (inputElement.value) {
            inputElement.value.focus()
        }
    })
}

function reset() {
    inputValue.value = props.label
}

defineExpose({ reset: reset })
</script>

<template>
    <div :class="!isEditEnabled && 'overflow-x-hidden'">
        <input
            v-if="isEditEnabled"
            ref="inputElement"
            v-model="inputValue"
            type="text"
            class="p-1 m-0 w-full"
            @focusout="onInputUpdate"
            @keyup.enter="onInputUpdate"
        />
        <label v-else class="mx-1 hover:cursor-text block my-auto" @click="toggleEdit">
            {{ inputValue }}
        </label>
    </div>
</template>
