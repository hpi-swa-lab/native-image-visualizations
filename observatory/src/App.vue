<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import { VisualizationType } from './ts/types/visualizationType';

import HierarchyBubbles from './visualizations/HierarchyBubbles.vue'
import SankeyTree from './visualizations/SankeyTree.vue'
import TreeLine from './visualizations/TreeLine.vue'
import Venn from './visualizations/Venn.vue'
import ZoomableCausalityGraph from './visualizations/ZoomableCausalityGraph.vue'

let currentVis = VisualizationType.HierarchyBubbles

</script>

<template>
  <div>
    <Sidebar
      @visualization-change="(newVis: VisualizationType) => {currentVis = newVis}"
    >
    <slot name="visualization-specific-options"/>
  </Sidebar>
  <div>
    <HierarchyBubbles :v-if="currentVis === VisualizationType.HierarchyBubbles"/>
    <SankeyTree :v-if="currentVis === VisualizationType.SankeyTree"/>
    <TreeLine :v-if="currentVis === VisualizationType.TreeLine"/>
    <Venn :v-if="currentVis === VisualizationType.Venn"/>
    <ZoomableCausalityGraph :v-if="currentVis === VisualizationType.ZoomableCausalityGraph"/>
  </div>
  </div>
</template>
