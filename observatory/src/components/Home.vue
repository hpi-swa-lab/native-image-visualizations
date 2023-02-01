<script setup lang="ts">
import MainLayout from './layouts/MainLayout.vue'
import { SwappableComponentType } from '../ts/enums/SwappableComponentType'
</script>

<template>
    <MainLayout title="Home" :component-type="SwappableComponentType.Home"></MainLayout>
</template>
