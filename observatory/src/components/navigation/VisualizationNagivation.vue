<template>
  <div>
      <VisualizationLink v-for="link in links" :router-link="link.routerLink" :name="link.name"></VisualizationLink>
  </div>
</template>

<script setup lang="ts">
import VisualizationLink from "./VisualizationLink.vue";

interface Link {
  routerLink: string,
  name: string
}

const links: Link[] = [
  {routerLink: "/zoomable-causality-graph", name: "Zoomable Causality Graph"},
  {routerLink: "/tree-line", name: "Tree Line"},
  {routerLink: "/sankey-tree", name: "Sankey Tree"},
  {routerLink: "/venn", name: "Venn"},
  {routerLink: "/hierarchy-bubbles", name: "Hierarchy Bubbles"},
]

</script>

<style scoped>
</style>