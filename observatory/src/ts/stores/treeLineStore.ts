import { defineStore } from 'pinia'

export type TreeLineConfig = Record<string, unknown>

export const useTreeLineStore = defineStore('treeLineConfig', {
    actions: {
        loadExportDict(config: TreeLineConfig) {
            // TODO
        },
        toExportDict(): TreeLineConfig {
            return {}
        }
    }
})
