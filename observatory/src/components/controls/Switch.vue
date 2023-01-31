<script setup lang="ts">

withDefaults(
    defineProps<{
      id:string,
      value: string,
    }>(),
    {
      value: '',
    }
)
</script>

<template>
  <div>
    <input :id="id" :value="value" type="checkbox"/>
    <slot></slot>
  </div>
</template>