import { Node } from './Node'
import { Universe } from './Universe'
import { UniverseIndex } from '../SharedTypes/Indices'

export class CausalityGraphData {
    // Object structure of "reachability.json"
    reachabilityData: object[] = []

    // Should be renamed to something like "nodeLabels", since it describes all kinds of events
    // Currently keeps this name for consistency with all other causality-processing code
    methodList: string[] = []
    typeList: string[] = []
        // These binary blobs are handed to the wasm module

    // These binary blobs are handed to the wasm module
    'interflows.bin': Uint8Array
    'direct_invokes.bin': Uint8Array
    'typestates.bin': Uint8Array
    'typeflow_filters.bin': Uint8Array
    'typeflow_methods.bin': Uint8Array
}

export class CausalityGraphUniverse extends Universe {
    public causalityData: CausalityGraphData

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.causalityData = causalityData
    }
}
