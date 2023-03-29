<script setup lang="ts">
import img1 from '../../assets/images/sankey/1.png'
import img2 from '../../assets/images/sankey/2.png'

const slides = [
    { content: '', src: img1 },
    { content: '', src: img2 },
    {
        content:
            'Filtering for a custom nodes selection: Please, note that when filtering for a custom selection, branches where nodes other than the node at the end of a hierarchy level X is selected get filtered out and do not appear on screen.  For example, only when node ci or code (=last node on the branch) from ;jdk.internal.vm.ci;jdk.vm.ci.code is selected, the branch containing this node is filtered in. Selecting any other node here (e.g., ;jdk), filters this branch out. The position of a node in the hierarchy is indicated by its path, shown in the tooltip.'
    }
]
</script>

<template>
    <div v-for="(slide, index) in slides" :key="index" class="border space-y-4 p-4">
        <img v-if="slide.src" :src="slide.src" />
        <hr v-if="slide.content && slide.src" />
        <p>{{ slide.content }}</p>
    </div>
</template>
