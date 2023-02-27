import { defineStore } from 'pinia'

export type TreeLineConfig = Record<string, unknown>

export const useTreeLineStore = defineStore('treeLineConfig', {
    actions: {
        toExportDict(): TreeLineConfig {
            return {}
        }
    }
})
