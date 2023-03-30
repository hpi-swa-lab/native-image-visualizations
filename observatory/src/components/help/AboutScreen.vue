<script setup lang="ts">
import { EventType } from '../../ts/enums/EventType'

const emit = defineEmits([EventType.CLOSE_ABOUT])
</script>

<template>
    <div class="relative bg-white h-full space-y-4 rounded-lg shadow">
        <div class="flex items-start justify-between p-4 border-b rounded-t drop-shadow-sm">
            <p>About Us</p>
            <button class="btn-sm btn-danger" @click="emit(EventType.CLOSE_ABOUT)">
                <font-awesome-icon icon="xmark" />
            </button>
        </div>
        <div class="h-[90%] overflow-y-auto p-4 space-y-4">
            <h3>About Us</h3>
            <p>
                This project is the result of a master's project at Hasso Plattner Institute in the
                winter semester 2022/2023.
            </p>
            <p>The team members are:</p>
            <ul class="list-disc px-4">
                <li><a href="https://github.com/JoeAtHPI">Joana Bergsiek</a></li>
                <li><a href="https://github.com/ChristophTF">Christoph Blumschein</a></li>
                <li><a href="https://github.com/MarcelGarus">Marcel Garus</a></li>
                <li><a href="https://github.com/LucPrestin">Luc Prestin</a></li>
                <li><a href="https://github.com/LinaUr">Lina Urban</a></li>
            </ul>
        </div>
    </div>
</template>
