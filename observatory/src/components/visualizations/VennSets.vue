<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { PageType } from '../../ts/enums/PageType'
</script>

<template>
    <MainLayout title="Venn Sets" :page-type="PageType.VennSets">
        <div id="container" />
    </MainLayout>
</template>
