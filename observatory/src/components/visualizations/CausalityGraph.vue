<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { PageType } from '../../ts/enums/PageType'
</script>

<template>
    <MainLayout title="WIP: Causality Graph" :page-type="PageType.CausalityGraph">
        <div id="container" />
    </MainLayout>
</template>
