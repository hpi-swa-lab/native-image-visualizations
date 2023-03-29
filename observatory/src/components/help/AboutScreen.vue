<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render'

const aboutText = `
# About Us
`
</script>

<template>
    <VueMarkdown :source="aboutText" />
</template>
