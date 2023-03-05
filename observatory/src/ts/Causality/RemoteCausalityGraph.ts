import * as original from './CausalityGraph';
import * as Comlink from 'comlink'

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

    public simulatePurgesBatched(purgeRoot: original.PurgeTreeNode, prepurgeMids: number[] = []): original.IncrementalSimulationResult {
        return Comlink.proxy(this.wrapped.simulatePurgesBatched(purgeRoot, prepurgeMids))
    }
}

Comlink.expose(RemoteCausalityGraph)