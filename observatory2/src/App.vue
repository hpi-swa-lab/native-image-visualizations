<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import { VisualizationType } from './ts/types/visualizationType';


function changeVisualization(newVis: VisualizationType) {

}

</script>

<template>
  <div>
    <Sidebar
      @visualization-change="changeVisualization"
    ></Sidebar>
  </div>
</template>
