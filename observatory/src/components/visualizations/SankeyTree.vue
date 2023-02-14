<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { EventType } from '../../ts/enums/EventType'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
import COLORS from '../../ts/constants/ColorPalette'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import { NodesFilter } from '../../ts/SharedTypes/NodesFilter'
import { DEFAULT_NODES_FILTER } from '../../ts/constants/SankeyTreeConstants'

const emit = defineEmits([EventType.CHANGE_PAGE])

withDefaults(
    defineProps<{
        universes: Universe[]
    }>(),
    { universes: () => [] }
)

const universeMetadata: Record<number, UniverseProps> = {
    '0': { name: 'Universe1', color: COLORS.red },
    '1': { name: 'Universe2', color: COLORS.green }
}

const nodesFilter: NodesFilter = DEFAULT_NODES_FILTER

function handleFilterUpdate() {
    // TODO #39
}
</script>

<template>
    <MainLayout
        title="Sankey Tree"
        :component-type="SwappableComponentType.SankeyTree"
        @change-page="(componentType: SwappableComponentType) => emit(EventType.CHANGE_PAGE, componentType)"
    >
        <template #controls>
            <SankeyTreeControls
                :universes-metadata="universeMetadata"
                :nodes-filter="nodesFilter"
                @update="handleFilterUpdate()"
            ></SankeyTreeControls>
        </template>
        <div id="container" />
    </MainLayout>
</template>
