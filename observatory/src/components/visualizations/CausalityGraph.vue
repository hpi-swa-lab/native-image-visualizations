<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { Universe } from '../../ts/UniverseTypes/Universe'

withDefaults(defineProps<{ universe: Universe | undefined }>(), { universe: undefined })
</script>

<template>
    <MainLayout
        title="WIP: Causality Graph"
        :component-type="SwappableComponentType.CausalityGraph"
    >
        <div id="container" />
    </MainLayout>
</template>
