<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'

const emit = defineEmits([EventType.CHANGE_PAGE])

withDefaults(defineProps<{ universe: Universe | undefined }>(), { universe: undefined })
</script>

<template>
    <MainLayout
        title="WIP: Causality Graph"
        :component-type="SwappableComponentType.CausalityGraph"
        @change-page="(componentNumber: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentNumber)"
    >
        <div id="container" />
    </MainLayout>
</template>
