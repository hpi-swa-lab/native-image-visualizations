<template>
    <img
        v-for="index in 6"
        :key="index"
        class="border p-4"
        :src="`src/assets/images/home/${index}.png`"
    />
</template>
