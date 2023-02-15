<script setup lang="ts">
import { ref } from 'vue';
import { EventType } from '../../ts/enums/EventType';
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType';
import { Multiverse } from '../../ts/UniverseTypes/Multiverse';
import { Universe } from '../../ts/UniverseTypes/Universe';
import { TreeLine } from '../../ts/Visualizations/TreeLine';
import MainLayout from '../layouts/MainLayout.vue';

const emit = defineEmits([EventType.CHANGE_PAGE])

const props = withDefaults(
    defineProps<{
        universes: Universe[]
    }>(),
    { universes: () => [] }
)
// const universes = ref<Universe[]>(props.universes)

console.log('Universes: ', props.universes)
const multiverse = new Multiverse(props.universes)

const container = ref<HTMLDivElement>()
let visualization: TreeLine = new TreeLine(
    container.value!,
    new Map([[0, '#1b9e77'], [1, '#72286f']])
)
visualization.setMultiverse(multiverse)
</script>

<template>
    <MainLayout title="Tree Line" :component-type="SwappableComponentType.TreeLine"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentType)">

        <div id="container">
            <div id="tree-line-container" ref="container" class="w-full h-full" />
        </div>
    </MainLayout>
</template>