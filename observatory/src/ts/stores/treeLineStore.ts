/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Reason for disabling: currently, these methods do nothing,
 * as the treeLineConfig does not have any state. However,
 * these methods should still exist for uniformity. Disabling the checks
 * for only line 16 did not work, as eslint then complained about the
 * eslint-disable calls to be too long a line of code.
 */

import { defineStore } from 'pinia'

export type TreeLineConfig = Record<string, unknown>

export const useTreeLineStore = defineStore('treeLineConfig', {
    actions: {
        loadExportDict(config: TreeLineConfig): void {},
        toExportDict(): TreeLineConfig {
            return {}
        }
    }
})
