import { Node } from './Node'
import { Universe } from './Universe'
import { CausalityGraph } from '../Causality/CausalityGraph';

export interface CausalityGraphData {
    // Object structure of "reachability.json"
    reachabilityData: object[]

    // Should be renamed to something like "nodeLabels", since it describes all kinds of events
    // Currently keeps this name for consistency with all other causality-processing code
    methodList: string[]
    typeList: string[]

    // These binary blobs are handed to the wasm module
    'interflows.bin': Uint8Array
    'direct_invokes.bin': Uint8Array
    'typestates.bin': Uint8Array
    'typeflow_filters.bin': Uint8Array
    'typeflow_methods.bin': Uint8Array
}

export class CausalityGraphUniverse extends Universe {
    // Object structure of "reachability.json"
    public reachabilityData: object[]
    public cgNodeLabels: string[]
    public cgTypeLabels: string[]

    public cg: CausalityGraph

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.reachabilityData = causalityData.reachabilityData
        this.cgNodeLabels = causalityData.methodList
        this.cgTypeLabels = causalityData.typeList
        this.cg = new CausalityGraph(causalityData.methodList.length, causalityData.typeList.length, causalityData)
    }
}
