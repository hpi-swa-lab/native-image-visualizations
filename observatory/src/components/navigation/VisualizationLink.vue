<template>
  <router-link :to="routerLink">
    <li class="btn btn-primary">
      {{name}}
    </li>
  </router-link>
</template>

<script setup lang="ts">

const props = defineProps({
  routerLink: String,
  name: String
})
</script>

<style scoped>
  li {
    margin-bottom: 2px;
  }
</style>