<script setup lang="ts">
interface Props {
    entryPoints: Array<any>
    directEdges: Array<any>
    virtualEdges: Array<any>
    methods: Array<any>
}

const props = defineProps<Props>()

// const visualization = new ZoomableCausalityGraph(this.$container)

// watch(props.entryPoints, (data: HierarchyNodeWithSize) => {})
// watch(props.directEdges, (data: HierarchyNodeWithSize) => {})
// watch(props.virtualEdges, (data: HierarchyNodeWithSize) => {})
// watch(props.methods, (data: HierarchyNodeWithSize) => {})

// TODO: initialize visualization

// TODO: add the custom controls to start and continue the simulation
</script>

<template>
    <div id="container"></div>
</template>
