import { defineStore } from 'pinia'

export type TreeLineConfig = Record<string, unknown>

export const useTreeLineStore = defineStore('treeLineConfig', {
    actions: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        loadExportDict(config: TreeLineConfig): void {},
        toExportDict(): TreeLineConfig {
            return {}
        }
    }
})
