<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
    defineProps<{
        tabNames: string[]
        buttonNames: string[]
        selectedIndex: number
    }>(),
    {
        tabNames: () => [],
        buttonNames: () => [],
        selectedIndex: 0
    }
)

const currentIndex = ref<number>(props.selectedIndex)
</script>
<template>
    <div>
        <ul class="flex border-b">
            <li
                v-for="(name, index) in buttonNames"
                :key="`tab-button-${index}`"
                class="-mb-px mr-1"
            >
                <button
                    :data-tab-index="index"
                    :class="`bg-gray-50 inline-block rounded-t py-2 px-4 text-blue-700 font-semibold${
                        currentIndex === index ? ' border-l border-t border-r rounded-t' : ''
                    }`"
                    @click="
                        () => {
                            currentIndex = index
                        }
                    "
                >
                    {{ name }}
                </button>
            </li>
        </ul>
        <div
            v-for="(name, index) in tabNames"
            :key="`tab-content-${index}`"
            :hidden="index !== currentIndex"
        >
            <slot :name="`tab-content-${name}`" />
        </div>
    </div>
</template>
