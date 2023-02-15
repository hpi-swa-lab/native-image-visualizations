<script setup lang="ts">
withDefaults(
    defineProps<{
        label: string
        color: string
    }>(),
    {
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
        <label> {{ label }} </label>
    </div>
</template>
