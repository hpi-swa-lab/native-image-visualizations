<script setup lang="ts">
import { watch } from 'vue'
import HierarchyNodeWithSize from '../ts/interfaces/HierarchyNodeWithSize'
import HierarchyBubbles from '../ts/Visualizations/HierarchyBubbles'

interface Props {
    data: HierarchyNodeWithSize
}

const props = defineProps<Props>()

const visualization = new HierarchyBubbles(this.$container)

watch(props.data, (data: HierarchyNodeWithSize) => {
    visualization.data = data
    visualization.generate()
})

visualization.data = props.data

// TODO: add the custom controls to start and continue the simulation
</script>

<template>
    <div id="container"></div>
</template>
