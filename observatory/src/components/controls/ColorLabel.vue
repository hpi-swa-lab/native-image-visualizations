<script setup lang="ts">
withDefaults(
    defineProps<{
      value: string,
      color: string
    }>(),
    {
      value: '',
      color: '#ffffff'
    }
)
</script>

<template>
  <div class="inline">
    <input v-if="color" type="color" class="color-input" :value="color" disabled>
    <label> {{value}} </label>
  </div>
</template>