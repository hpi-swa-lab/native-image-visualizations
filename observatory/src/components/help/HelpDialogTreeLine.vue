<script setup lang="ts">
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

</script>

<template>
    <Carousel :mouse-drag="false">
    <Slide v-for="index in 9" :key="index">
        <div class="carousel__item">
        <img :src="`src/assets/images/treeline/${index}.png`" />
        </div>
    </Slide>
    <template #addons>
        <Navigation />
        <Pagination />
    </template>
    </Carousel>
</template>