<script setup lang="ts">
withDefaults(
    defineProps<{
        forElement: string
        label: string
        color: string
    }>(),
    {
        forElement: '',
        label: '',
        color: '#ffffff'
    }
)
</script>

<template>
    <div class="inline">
        <input
            v-if="color"
            type="color"
            class="mr-1 w-4 h-4 align-middle p-0 border-none"
            :value="color"
            disabled
        />
        <label :for="forElement"> {{ label }} </label>
    </div>
</template>
