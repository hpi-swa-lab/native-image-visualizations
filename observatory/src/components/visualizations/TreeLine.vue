<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'

const emit = defineEmits([EventType.CHANGE_PAGE])

withDefaults(
    defineProps<{
        universes: Universe[]
    }>(),
    { universes: () => [] }
)
</script>

<template>
    <MainLayout
        title="Tree Line"
        :component-type="SwappableComponentType.TreeLine"
        @change-page="(componentNumber: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentNumber)"
    >
        <div id="container" />
    </MainLayout>
</template>
