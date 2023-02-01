<script setup lang="ts">
withDefaults(
    defineProps<{
        id: string
        value: string
    }>(),
    {
        id: '',
        value: ''
    }
)
</script>

<template>
    <div>
        <input :id="id" :value="value" type="checkbox" class="ml-1" />
        <slot></slot>
    </div>
</template>
