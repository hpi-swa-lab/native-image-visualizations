<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { PageType } from '../../ts/enums/PageType'
</script>

<template>
    <MainLayout title="Tree Line" :page-type="PageType.TreeLine">
        <div id="container" />
    </MainLayout>
</template>
