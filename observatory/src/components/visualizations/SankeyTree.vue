<script setup lang="ts">
import MainLayout from '../MainLayout.vue'
import { VisualizationType } from '../../ts/enums/VisualizationType'
import SankeyTreeControls from '../controls/SankeyTreeControls.vue'
import { COLOR_GREEN, COLOR_RED } from '../../ts/constants/ColorPalette'
import { UniverseProps } from '../../ts/interfaces/UniverseProps'
import { NodesFilter } from '../../ts/SharedTypes/NodesFilter'
import { DEFAULT_NODES_FILTER } from '../../ts/constants/SankeyTreeConstants'

const universeMetadata: Record<number, UniverseProps> = {
    '0': { name: 'Universe1', color: COLOR_RED },
    '1': { name: 'Universe2', color: COLOR_GREEN }
}

const nodesFilter: NodesFilter = DEFAULT_NODES_FILTER

function handleFilterUpdate() {
    // TODO #39
}
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="VisualizationType.SankeyTree">
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
