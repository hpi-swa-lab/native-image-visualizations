<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
</script>

<template>
    <MainLayout title="Tree Line" :visualization-type="VisualizationType.TreeLine">
        <div id="container" />
    </MainLayout>
</template>
