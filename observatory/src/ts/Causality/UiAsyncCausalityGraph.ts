import * as original from './CausalityGraph'
import {
    AsyncCausalityGraph,
    AsyncDetailedSimulationResult,
    AsyncIncrementalSimulationResult
} from './AsyncCausalityGraph'

// Executes causality queries on UI thread.
// Workaround for bug in firefox: https://bugzil.la/1247687

export class UiAsyncCausalityGraph implements AsyncCausalityGraph {
    wrapped: original.CausalityGraph

    public constructor(nMethods: number, nTypes: number, data: original.CausalityGraphBinaryData) {
        this.wrapped = new original.CausalityGraph(nMethods, nTypes, data)
    }

    public async simulatePurge(nodesToBePurged: number[] = []): Promise<Uint8Array> {
        await new Promise((r) => setTimeout(r, 1))
        return this.wrapped.simulatePurge(nodesToBePurged)
    }

    public async simulatePurgeDetailed(
        nodesToBePurged: number[] = []
    ): Promise<AsyncDetailedSimulationResult> {
        await new Promise((r) => setTimeout(r, 1))
        return new UIAsyncDetailedSimulationResult(
            this.wrapped.simulatePurgeDetailed(nodesToBePurged)
        )
    }

    public async simulatePurgesBatched(
        purgeRoot: original.PurgeTreeNode<number>,
        prepurgeMids: number[] = []
    ): Promise<AsyncIncrementalSimulationResult> {
        await new Promise((r) => setTimeout(r, 1))
        return new UiAsyncIncrementalSimulationResult(
            this.wrapped.simulatePurgesBatched(purgeRoot, prepurgeMids)
        )
    }

    public delete() {
        this.wrapped.delete()
    }
}

class UiAsyncIncrementalSimulationResult implements AsyncIncrementalSimulationResult {
    wrapped: original.IncrementalSimulationResult<number>

    constructor(wrapped: original.IncrementalSimulationResult<number>) {
        this.wrapped = wrapped
    }

    async simulateNext(): Promise<{ token: number, history: Uint8Array } | undefined> {
        await new Promise((r) => setTimeout(r, 1))
        return this.wrapped.simulateNext()
    }

    async getReachableArray(): Promise<Uint8Array> {
        await new Promise((r) => setTimeout(r, 1))
        return this.wrapped.getReachableArray()
    }

    delete() {
        this.wrapped.delete()
    }
}

class UIAsyncDetailedSimulationResult implements AsyncDetailedSimulationResult {
    wrapped: original.DetailedSimulationResult

    constructor(wrapped: original.DetailedSimulationResult) {
        this.wrapped = wrapped
    }

    async getReachabilityHyperpath(mid: number): Promise<original.ReachabilityHyperpathEdge[]> {
        await new Promise((r) => setTimeout(r, 1))
        return this.wrapped.getReachabilityHyperpath(mid)
    }

    async getReachableArray(): Promise<Uint8Array> {
        await new Promise((r) => setTimeout(r, 1))
        return this.wrapped.getReachableArray()
    }

    delete(): void {
        this.wrapped.delete()
    }
}
