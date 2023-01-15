<template>
    <div>
        <aside class="w-64">
        <div
            class="px-3 py-4 overflow-y-auto rounded bg-gray-50"
        >
            <ul class="space-y-2">
                <slot name="controls"></slot>
            </ul>
        </div>
    </aside>
        <div>
            <slot></slot>
        </div>
    </div>
</template>
