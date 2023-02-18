<script setup lang="ts">
withDefaults(
    defineProps<{
        title: string
        alertInfos: string[]
    }>(),
    {
        title: '',
        alertInfos: () => []
    }
)
</script>

<template>
    <div role="alert">
        <div class="bg-cyan-600 text-white rounded-t px-4 py-2">{{ title }}</div>
        <div
            class="border border-t-0 border-cyan-400 rounded-b bg-cyan-100 px-4 py-3 text-cyan-700"
        >
            <ul class="list-unstyled">
                <li v-for="info in alertInfos" :key="alertInfos.indexOf(info)">
                    {{ info }}
                </li>
            </ul>
        </div>
    </div>
</template>
