<script setup lang="ts">
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'
</script>

<template>
    <carousel :items-to-show="1">
        <slide v-for="slide in 10" :key="slide">
            {{ slide }}
        </slide>

        <template #addons>
            <navigation />
            <pagination />
        </template>
    </carousel>
</template>
