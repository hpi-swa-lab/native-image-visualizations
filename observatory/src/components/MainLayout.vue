<template>
    <div class="w-full h-full">
        <aside class="w-64 z-1">
            <div
                class="px-3 py-4 overflow-y-auto rounded bg-gray-50"
            >
                <ul class="space-y-2">
                    <slot name="controls"></slot>
                </ul>
            </div>
        </aside>
        <div class="w-full h-full">
            <slot></slot>
        </div>
    </div>
</template>
