<script setup lang="ts">
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

const slides = [
  { content: 'Welcome to the Venn Sets! In this visualization, you can find overlaps or disjunctions between multiple GraalVM Universes. Or, you can simply explore the contents of a single one. As Java applications have different levels of details - packages, modules, or methods - use the control’s slider to set the level you want to focus on. The displayed intersections are up to the set level only.' , src: '1.png'},
  { content: 'Notice the bubble size too - they re-adjust with each level too. So a bubble with a radius of 3 on module level has a different code size than one on the method level. For absolute sizes, you want to check out the Tree Line! ' , src: '2.png'},
]

</script>

<template>
    <Carousel >
    <Slide v-for="slide, index in slides" :key="index">
        <div class="carousel__item">
        <p class="mb-10">{{ slide.content }}</p>
        <img :src="`src/assets/images/venn/${slide.src}`" />
        </div>
    </Slide>
    <template #addons>
        <Navigation />
        <Pagination />
    </template>
    </Carousel>
</template>