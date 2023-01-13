<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import { VisualizationType } from './ts/types/visualizationType'

import HierarchyBubbles from './visualizations/HierarchyBubbles.vue'
import SankeyTree from './visualizations/SankeyTree.vue'
import TreeLine from './visualizations/TreeLine.vue'
import Venn from './visualizations/Venn.vue'
import ZoomableCausalityGraph from './visualizations/ZoomableCausalityGraph.vue'

let currentVis = VisualizationType.HierarchyBubbles

let entryPoints = []
let directEdges = []
let virtualEdges = []
let methods = []
let bubbleHierarchy = {}

function dataChange(newData) {
 // TODO: update all the data
}

function visualizationChange(newVis: VisualizationType) {
  currentVis = newVis
}

// TODO: react to data changes
</script>

<template>
    <div>
        <Sidebar
          @data-change="dataChange"
          @visualization-change="visualizationChange">
            <slot name="visualization-specific-options" />
        </Sidebar>
        <div>
            <HierarchyBubbles :data="bubbleHierarchy" :v-if="currentVis === VisualizationType.HierarchyBubbles" />
            <SankeyTree :v-if="currentVis === VisualizationType.SankeyTree" />
            <TreeLine :v-if="currentVis === VisualizationType.TreeLine" />
            <Venn :v-if="currentVis === VisualizationType.Venn" />
            <ZoomableCausalityGraph
                :entry-points="entryPoints"
                :direct-edges="directEdges"
                :virtual-edges="virtualEdges"
                :methods="methods"
                :v-if="currentVis === VisualizationType.ZoomableCausalityGraph"
            />
        </div>
    </div>
</template>
