<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import HelpDialogHome from './HelpDialogHome.vue'
import HelpDialogCausalityGraph from './HelpDialogCausalityGraph.vue'
import HelpDialogSankeyTree from './HelpDialogSankeyTree.vue'
import HelpDialogTreeLine from './HelpDialogTreeLine.vue'
import HelpDialogVennSets from './HelpDialogVennSets.vue'

const store = useGlobalStore()
</script>

<template>
    <HelpDialogHome v-if="store.currentComponent === SwappableComponentType.Home" />
    <HelpDialogCausalityGraph
        v-else-if="store.currentComponent === SwappableComponentType.CausalityGraph"
    />
    <HelpDialogSankeyTree
        v-else-if="store.currentComponent === SwappableComponentType.SankeyTree"
    />
    <HelpDialogTreeLine v-else-if="store.currentComponent === SwappableComponentType.TreeLine" />
    <HelpDialogVennSets v-else-if="store.currentComponent === SwappableComponentType.VennSets" />
</template>
