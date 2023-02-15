<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
    defineProps<{
        tabNames: string[]
        selectedIndex: number
    }>(),
    {
        tabNames: () => [],
        selectedIndex: 0
    }
)

const currentIndex = ref<number>(props.selectedIndex)
</script>
<template>
    <div>
        <ul class="flex flex-wrap -mb-px">
            <li v-for="(name, index) in tabNames" :key="`tab-button-${index}`" class="tab-button">
                <button
                    :data-tab-index="index"
                    class="nav-link w-full block font-medium text-xs leading-tight uppercase border-x-0 border-t-0 border-b-2 border-transparent px-6 py-3 my-2 hover:border-transparent hover:bg-gray-100 focus:border-transparent"
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
