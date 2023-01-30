<script setup lang="ts">
import MainLayout from './MainLayout.vue'
import { VisualizationType } from '../ts/enums/VisualizationType'
</script>

<template>
    <MainLayout title="Home" :visualization-type="VisualizationType.None"> </MainLayout>
</template>
