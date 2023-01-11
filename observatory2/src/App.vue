<script setup lang="ts">
import { propsToAttrMap } from '@vue/shared';
import Sidebar from './components/Sidebar.vue'
import { VisualizationType } from './types/visualizationType';


</script>

<template>
  <div>
    <Sidebar
      @visualization-change="(newVis: VisualizationType) => {}"
    ></Sidebar>
  </div>
</template>
