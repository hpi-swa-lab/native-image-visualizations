<script setup lang="ts">
import { nextTick, ref } from 'vue'
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
</script>

<template>
    <div :class="!isEditEnabled && 'overflow-x-hidden'">
        <template v-if="isEditEnabled">
            <input
                ref="inputElement"
                v-model="inputValue"
                type="text"
                class="p-1 m-0 w-full"
                @focusout="onInputUpdate"
                @keyup.enter="onInputUpdate"
            />
        </template>
        <template v-else>
            <label class="mx-1 hover:cursor-text block my-auto" @click="toggleEdit">
                {{ inputValue }}
            </label>
        </template>
    </div>
</template>
