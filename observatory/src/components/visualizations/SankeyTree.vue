<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import COLORS from '../../ts/constants/ColorPalette'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import { NodesFilter } from '../../ts/SharedTypes/NodesFilter'
import { DEFAULT_NODES_FILTER } from '../../ts/constants/SankeyTreeConstants'

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
    <MainLayout title="Sankey Tree">
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
