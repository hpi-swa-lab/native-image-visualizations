<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { PageType } from '../../ts/enums/PageType'
</script>

<template>
    <MainLayout title="Sankey Tree" :page-type="PageType.SankeyTree">
        <div id="container" />
    </MainLayout>
</template>
