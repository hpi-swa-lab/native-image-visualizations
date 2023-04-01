<script setup lang="ts">
import img1 from '../../assets/images/sankey/1.png'
import img2 from '../../assets/images/sankey/2.png'
import img3 from '../../assets/images/sankey/3.png'

const slides = [
    { content: '', src: img1 },
    { content: '', src: img2 },
    { content: '', src: img3 }
]
</script>

<template>
    <div v-for="(slide, index) in slides" :key="index" class="border space-y-4 p-4">
        <img v-if="slide.src" :src="slide.src" />
        <hr v-if="slide.content && slide.src" />
        <p>{{ slide.content }}</p>
    </div>
</template>
