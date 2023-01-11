<script setup lang="ts">
import { VisualizationType } from '../types/visualizationType'

const emit = defineEmits(['visualization-change'])
</script>

<template>
    <div class="sticky-top">
        <h2>Global Options</h2>
        <select
            @change="(event: Event) => {
                emit('visualization-change', parseInt((event.target as HTMLSelectElement).selectedOptions[0].value))
            }"
            name="select-visualization"
            id="select-visualization"
            class="form-select"
        >
            <option :value="VisualizationType.Venn">Venn</option>
            <option :value="VisualizationType.TreeLine">Tree Line</option>
            <option :value="VisualizationType.SankeyTree">Sankey Tree</option>
            <option :value="VisualizationType.HierarchyBubbles">Hierarchy Bubbles</option>
            <option :value="VisualizationType.ZoomableCausalityGraph">
                Zoomable Causality Graph
            </option>
        </select>
        <hr>
        <h2>Visualization-Specific Options</h2>
        <slot/>
    </div>
</template>
