<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
</script>

<template>
    <MainLayout
        title="WIP: Causality Graph"
        :component-type="SwappableComponentType.CausalityGraph"
    >
        <div id="container" />
    </MainLayout>
</template>
