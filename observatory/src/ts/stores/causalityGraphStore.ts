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

export type CausalityGraphConfig = Record<string, unknown>

export const useCausalityGraphStore = defineStore('causalityGraphConfig', {
    actions: {
        loadExportDict(config: CausalityGraphConfig) {},
        toExportDict(): CausalityGraphConfig {
            return {}
        }
    }
})
