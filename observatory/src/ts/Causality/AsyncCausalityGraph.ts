import * as original from './CausalityGraph'

// Provides a common interface for querying causality data.
// This either happens on the UI thread, or via Comlink on a background worker.

export interface AsyncCausalityGraph {
    simulatePurge(nodesToBePurged?: number[]): Promise<Uint8Array>
    simulatePurgeDetailed(nodesToBePurged?: number[]): Promise<AsyncDetailedSimulationResult>
    simulatePurgesBatched(
        purgeRoot: original.PurgeTreeNode<number>,
        prepurgeMids: number[]
    ): Promise<AsyncIncrementalSimulationResult>
    delete(): void
}

export interface AsyncSimulationResult {
    getReachableArray(): Promise<Uint8Array>
    delete(): void
}

export interface AsyncIncrementalSimulationResult extends AsyncSimulationResult {
    simulateNext(): Promise<number | undefined>
}

export interface AsyncDetailedSimulationResult extends AsyncSimulationResult {
    getReachabilityHyperpath(mid: number): Promise<original.ReachabilityHyperpathEdge[]>
}
