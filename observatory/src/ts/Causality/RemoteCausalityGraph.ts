import * as original from './CausalityGraph';
import * as Comlink from 'comlink'

// For execution of causality queries on background worker thread,
// this class wraps the object model in Comlink-Proxies.

export class RemoteCausalityGraph {
    wrapped: original.CausalityGraph

    public constructor(nMethods: number, nTypes: number, data: original.CausalityGraphBinaryData) {
        this.wrapped = new original.CausalityGraph(nMethods, nTypes, data)
    }

    public simulatePurge(nodesToBePurged: number[] = []): Uint8Array {
        return this.wrapped.simulatePurge(nodesToBePurged)
    }

    public simulatePurgeDetailed(nodesToBePurged: number[] = []): original.DetailedSimulationResult {
        return Comlink.proxy(this.wrapped.simulatePurgeDetailed(nodesToBePurged))
    }

    public simulatePurgesBatched(purgeRoot: original.PurgeTreeNode<number>, prepurgeMids: number[] = []): original.IncrementalSimulationResult<number> {
        return Comlink.proxy(this.wrapped.simulatePurgesBatched(purgeRoot, prepurgeMids))
    }
}

Comlink.expose(RemoteCausalityGraph)