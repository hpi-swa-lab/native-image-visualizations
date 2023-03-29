<template>
    <img
        v-for="index in 5"
        :key="index"
        class="border p-4"
        :src="`src/assets/images/cuttool/${index}.png`"
    />
</template>
