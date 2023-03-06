import { Node } from './Node'
import { Universe } from './Universe'
import * as Comlink from 'comlink'

const RemoteCausalityGraph = Comlink.wrap(new Worker('/src/ts/Causality/RemoteCausalityGraph', { type: 'module'}))

interface Method
{
    flags?: ('jni' | 'reflection' | 'main' | 'synthetic')[]
    size: number
}

interface Field
{
    flags?: ('jni' | 'reflection' | 'synthetic')[]
}

interface Type
{
    methods: { [name: string]: Method }
    fields: { [name: string]: Field }
    flags?: ['synthetic']
    'init-kind'?: ('build-time' | 'run-time')[]
}

interface Package
{
    types: { [name: string]: Type }
}

interface CodeSource
{
    path?: string
    module?: string
    flags?: ['system']
    packages: { [name: string]: Package }
}

export type ReachabilityJson = [CodeSource]

export interface CausalityGraphData {
    // Object structure of "reachability.json"
    reachabilityData: ReachabilityJson

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
    public reachabilityData: ReachabilityJson
    public cgNodeLabels: string[]
    public cgTypeLabels: string[]

    private cgPromise: Promise<Comlink.Remote<RemoteCausalityGraph>>

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.reachabilityData = causalityData.reachabilityData
        this.cgNodeLabels = causalityData.methodList
        this.cgTypeLabels = causalityData.typeList

        this.cgPromise = new RemoteCausalityGraph(causalityData.methodList.length, causalityData.typeList.length, causalityData)
    }

    async getCausalityGraph() {
        return await this.cgPromise
    }
}
