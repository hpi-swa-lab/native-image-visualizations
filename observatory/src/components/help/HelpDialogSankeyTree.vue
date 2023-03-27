<script setup lang="ts">
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

const slides = [
  { content: '' , src: '1.png'},
  { content: '' , src: '2.png'},
  { content: 'Filtering for a custom nodes selection: Please, note that when filtering for a custom selection, branches where nodes other than the node at the end of a hierarchy level X is selected get filtered out and don’t appear on screen.  For example, only when node ci or code (=last node on the branch) from ;jdk.internal.vm.ci;jdk.vm.ci.code is selected, the branch containing this node is filtered in. Selecting any other node here (e.g., ;jdk), filters this branch out. A node’s position in the hierarchy is indicated by its path, shown in the tooltip.'}
]

</script>

<template>
    <Carousel >
    <Slide v-for="slide, index in slides" :key="index">
        <div class="carousel__item">
        <p>{{ slide.content }}</p>
        <img v-if="slide.src" :src="`src/assets/images/sankey/${slide.src}`" />
        </div>
    </Slide>
    <template #addons>
        <Navigation />
        <Pagination />
    </template>
    </Carousel>
</template>