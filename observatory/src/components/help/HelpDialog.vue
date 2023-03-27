<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { SwappableComponentType } from '../../ts/enums/SwappableComponentType'
import HelpDialogHome from './HelpDialogHome.vue'
import HelpDialogSankeyTree from './HelpDialogSankeyTree.vue'
import HelpDialogTreeLine from './HelpDialogTreeLine.vue'
import HelpDialogVennSets from './HelpDialogVennSets.vue'
import HelpDialogCutTool from './HelpDialogCutTool.vue'

const store = useGlobalStore()
</script>

<template>
    <HelpDialogHome v-if="store.currentComponent === SwappableComponentType.Home" />
    <HelpDialogSankeyTree
        v-else-if="store.currentComponent === SwappableComponentType.SankeyTree"
    />
    <HelpDialogTreeLine v-else-if="store.currentComponent === SwappableComponentType.TreeLine" />
    <HelpDialogVennSets v-else-if="store.currentComponent === SwappableComponentType.VennSets" />
    <HelpDialogCutTool v-else-if="store.currentComponent === SwappableComponentType.CutTool" />
</template>