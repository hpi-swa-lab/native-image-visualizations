<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import COLORS from '../../ts/constants/ColorPalette'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'

const universeMetadata: Record<number, UniverseProps> = {
  '0': { name: 'Universe1', color: COLORS.red },
  '1': { name: 'Universe2', color: COLORS.green }
}

function handleNodesFilterChanged() {
  // TODO #39 -> update tree
}
</script>

<template>
    <MainLayout title="Sankey Tree">
        <template #controls>
            <SankeyTreeControls
                :universes-metadata="universeMetadata"
                @change="handleNodesFilterChanged()"
            ></SankeyTreeControls>
        </template>
        <div id="container" />
    </MainLayout>
</template>
