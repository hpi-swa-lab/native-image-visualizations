<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import { Universe } from '../../ts/UniverseTypes/Universe'

withDefaults(
    defineProps<{
        universes: Universe[]
    }>(),
    { universes: () => [] }
)
</script>

<template>
    <MainLayout title="Venn Sets" :component-type="SwappableComponentType.VennSets">
        <div id="container" />
    </MainLayout>
</template>
