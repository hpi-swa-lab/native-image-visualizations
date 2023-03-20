import * as original from './CausalityGraph'
import * as Comlink from 'comlink'
import { UiAsyncCausalityGraph } from './UiAsyncCausalityGraph'
import { CausalityGraphData } from '../UniverseTypes/CausalityGraphUniverse'

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

/*
 * Depending on whether the browser supports "module" script workers, Causality queries
 * are executed in a background worker or on the UI thread.
 */
export function loadCausalityGraphConstructor(): (
    nMethods: number,
    nTypes: number,
    causalityData: CausalityGraphData
) => Promise<AsyncCausalityGraph> {
    let workerCreated = false
    const tester = {
        get type(): 'module' {
            workerCreated = true
            return 'module'
        } // it's been called, it's supported
    }
    const worker = new Worker('/src/ts/Causality/RemoteCausalityGraph', tester)

    if (workerCreated) {
        const RemoteCausalityGraphWrapped = Comlink.wrap(worker) as unknown as {
            new (
                nMethods: number,
                nTypes: number,
                causalityData: CausalityGraphData
            ): Promise<AsyncCausalityGraph>
        }
        return (nMethods, nTypes, causalityData) =>
            new RemoteCausalityGraphWrapped(nMethods, nTypes, causalityData)
    } else {
        return (nMethods, nTypes, causalityData) =>
            new Promise((resolve) =>
                resolve(new UiAsyncCausalityGraph(nMethods, nTypes, causalityData))
            )
    }
}
