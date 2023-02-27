import { defineStore } from 'pinia'

export const useTreeLineStore = defineStore('treeLineConfig', {
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
        }
    }
})
