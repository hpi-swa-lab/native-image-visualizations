<template>
    <div class="space-y-4">
        <img
            v-for="index in 9"
            :key="index"
            :src="`src/assets/images/treeline/${index}.png`"
            class="border p-4"
        />
    </div>
</template>
