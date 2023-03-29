<script setup lang="ts">
import img1 from '../../assets/images/venn/1.png'
import img2 from '../../assets/images/venn/2.png'

const slides = [
    {
        content:
            'Welcome to the Venn Sets! In this visualization, you can find overlaps or disjunctions between multiple GraalVM Universes. Or, you can simply explore the contents of a single one. As Java applications have different levels of details – packages, modules, or methods – use the control’s slider to set the level you want to focus on. The displayed intersections are up to the set level only.',
        src: img1
    },
    {
        content:
            'Notice the bubble size too – they re-adjust with each level too. So a bubble with a radius of 3 on module level has a different code size than one on the method level. For absolute sizes, you want to check out the Tree Line! ',
        src: img2
    }
]
</script>

<template>
    <div v-for="(slide, index) in slides" :key="index" class="border space-y-4 p-4">
        <img :src="slide.src" />
        <hr v-if="slide.content" />
        <p>{{ slide.content }}</p>
    </div>
</template>
