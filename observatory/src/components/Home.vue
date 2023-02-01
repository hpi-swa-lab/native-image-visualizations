<script setup lang="ts">
import MainLayout from './layouts/MainLayout.vue'
import { PageType } from '../ts/enums/PageType'
</script>

<template>
    <MainLayout title="Home" :page-type="PageType.Home"> </MainLayout>
</template>
