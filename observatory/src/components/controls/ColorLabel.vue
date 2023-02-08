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
        <input v-if="color" type="color" class="mr-1" :value="color" disabled />
        <label> {{ label }} </label>
    </div>
</template>

<style scoped>
input {
    width: 1em;
    height: 1em;
    vertical-align: central;
}
</style>
