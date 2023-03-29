<script setup lang="ts">
import { useGlobalStore } from '../../ts/stores/globalStore'
import { SwappableComponentType, componentName } from '../../ts/enums/SwappableComponentType'
import HelpDialogHome from './HelpDialogHome.vue'
import HelpDialogSankeyTree from './HelpDialogSankeyTree.vue'
import HelpDialogTreeLine from './HelpDialogTreeLine.vue'
import HelpDialogVennSets from './HelpDialogVennSets.vue'
import HelpDialogCutTool from './HelpDialogCutTool.vue'
import { EventType } from '../../ts/enums/EventType'

const emit = defineEmits([EventType.CLOSE_HELP])

const store = useGlobalStore()
</script>

<template>
    <div class="relative bg-white h-full space-y-4 rounded-lg shadow">
        <div class="flex items-start justify-between p-4 border-b rounded-t drop-shadow-sm">
            <p>Help for {{ componentName(store.currentComponent) }}</p>
            <button class="btn-sm btn-danger" @click="emit(EventType.CLOSE_HELP)">
                <font-awesome-icon icon="xmark" />
            </button>
        </div>
        <div class="h-[90%] overflow-y-auto p-4 space-y-4">
            <HelpDialogHome v-if="store.currentComponent === SwappableComponentType.Home" />
            <HelpDialogSankeyTree
                v-else-if="store.currentComponent === SwappableComponentType.SankeyTree"
            />
            <HelpDialogTreeLine
                v-else-if="store.currentComponent === SwappableComponentType.TreeLine"
            />
            <HelpDialogVennSets
                v-else-if="store.currentComponent === SwappableComponentType.VennSets"
            />
            <HelpDialogCutTool
                v-else-if="store.currentComponent === SwappableComponentType.CutTool"
            />
        </div>
    </div>
</template>
