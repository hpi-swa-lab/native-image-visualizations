<script setup lang="ts">
import MainLayout from './layouts/MainLayout.vue'
import { EventType } from '../ts/enums/EventType'
import { SwappableComponentType } from '../ts/enums/SwappableComponentType'

const emit = defineEmits([EventType.CHANGE_PAGE])
</script>

<template>
    <MainLayout
        title="Home"
        :component-type="SwappableComponentType.Home"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentType)"
    ></MainLayout>
</template>
