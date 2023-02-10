<script setup lang="ts">
import { ref } from 'vue'
import Home from './components/Home.vue'
import CausalityGraph from './components/visualizations/CausalityGraph.vue'
import SankeyTree from './components/visualizations/SankeyTree.vue'
import { SwappableComponentType } from './ts/enums/SwappableComponentType'
import TreeLine from './components/visualizations/TreeLine.vue'
import Venn from './components/visualizations/VennSets.vue'
import DataManager from './components/DataManager.vue'
import { Universe } from './ts/UniverseTypes/Universe'

const currentComponent = ref<number>(SwappableComponentType.Home)

const handlePageChange = (value: number) => {
    currentComponent.value = value
}

const universes = ref<Universe[]>([])

function removeUniverse(universeName: string) {
    if (!universes.value) return

    const removedUniverse = (universes.value as Universe[]).find((universe: Universe) => {
        return universe.name === universeName
    })
    if (removedUniverse) {
        universes.value.splice(universes.value.indexOf(removedUniverse), 1)
    }
}

function addUniverse(newUniverse: Universe) {
    const currentUniverses = universes.value as Universe[]
    if (!currentUniverses.find((universe: Universe) => universe.name === newUniverse.name)) {
        universes.value.push(newUniverse)
    }
}
</script>

<template>
    <Venn
        v-if="currentComponent === SwappableComponentType.VennSets"
        :universes="(universes as Universe[])"
        @change-page="handlePageChange"
    ></Venn>
    <SankeyTree
        v-else-if="currentComponent === SwappableComponentType.SankeyTree"
        :universes="(universes as Universe[])"
        @change-page="handlePageChange"
    ></SankeyTree>
    <TreeLine
        v-else-if="currentComponent === SwappableComponentType.TreeLine"
        :universes="(universes as Universe[])"
        @change-page="handlePageChange"
    ></TreeLine>
    <CausalityGraph
        v-else-if="currentComponent === SwappableComponentType.CausalityGraph"
        :universes="universes[0]"
        @change-page="handlePageChange"
    ></CausalityGraph>
    <Home
        v-else-if="currentComponent === SwappableComponentType.Home"
        @change-page="handlePageChange"
    ></Home>
    <DataManager
        v-else-if="currentComponent === SwappableComponentType.DataManager"
        :universes="(universes as Universe[])"
        @change-page="handlePageChange"
        @universe-created="addUniverse"
        @universe-removed="removeUniverse"
    ></DataManager>
</template>
