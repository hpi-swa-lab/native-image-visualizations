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
            class="mr-1 w-[25px] h-[25px] p-0 align-middle border-none"
            :value="color"
            disabled
        />
        <label :for="forElement"> {{ label }} </label>
    </div>
</template>
