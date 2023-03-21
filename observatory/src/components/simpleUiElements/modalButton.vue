<script setup lang="ts">
import { ref } from 'vue'
withDefaults(
    defineProps<{
        icon?: string
        buttonText?: string
        buttonStyling?: string
    }>(),
    {
        icon: undefined,
        buttonText: '',
        buttonStyling: 'btn btn-primary'
    }
)
const showModal = ref(false)
</script>

<template>
    <button :class="buttonStyling" @click="showModal = !showModal">
        <font-awesome-icon v-if="icon !== undefined" :icon="icon" />
        {{ buttonText }}
    </button>

    <div
        v-if="showModal"
        tabindex="-1"
        class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto h-full"
    >
        <div class="relative w-full h-full max-w-2xl">
            <!-- Modal content -->
            <div class="relative bg-white rounded-lg shadow">
                <!-- Modal header -->
                <div class="flex items-start justify-between p-4 border-b rounded-t">
                    <slot name="modal-header" />
                </div>
                <!-- Modal body -->
                <div class="p-6 space-y-6">
                    <slot name="modal-content" />
                </div>
            </div>
        </div>
    </div>
</template>
