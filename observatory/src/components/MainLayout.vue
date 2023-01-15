<template>
    <div>
        <aside class="w-64" aria-label="Sidebar">
            <div class="px-3 py-4 overflow-y-auto rounded bg-gray-50">
                <slot name="controls">No controls</slot>
            </div>
        </aside>
        <div>
            <slot></slot>
        </div>
    </div>
</template>
