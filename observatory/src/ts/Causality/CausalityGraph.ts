import loadWASM from './lib/causality_graph.js'

const Module: any = await loadWASM()

const _CausalityGraph_init = Module.cwrap('CausalityGraph_init', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
const _CausalityGraph_simulatePurge = Module.cwrap('CausalityGraph_simulatePurge', 'number', ['number', 'number', 'number'])
const _CausalityGraph_simulatePurgeDetailed = Module.cwrap('CausalityGraph_simulatePurgeDetailed', 'number', ['number', 'number', 'number'])
const _CausalityGraph_simulatePurgesBatched = Module.cwrap('CausalityGraph_simulatePurgesBatched', 'number', ['number', 'number', 'number'])
const _SimulationResult_getMethodHistory = Module.cwrap('SimulationResult_getMethodHistory', 'number', ['number'])
const _DetailedSimulationResult_getMethodHistory = Module.cwrap('DetailedSimulationResult_getMethodHistory', 'number', ['number'])
const _DetailedSimulationResult_getReachabilityHyperpath = Module.cwrap('DetailedSimulationResult_getReachabilityHyperpath', 'number', ['number', 'number'])
const _Deletable_delete = Module.cwrap('Deletable_delete', 'void', ['number'])

export interface CausalityGraphBinaryData {
    'interflows.bin': Uint8Array
    'direct_invokes.bin': Uint8Array
    'typestates.bin': Uint8Array
    'typeflow_filters.bin': Uint8Array
    'typeflow_methods.bin': Uint8Array
}

export interface PurgeTreeNode {
    children: PurgeTreeNode[]
    mids: number[]
}

function calcPurgeNodesCount(purge_root: PurgeTreeNode) {
    let cnt = 1
    if(purge_root.mids && purge_root.children)
        cnt++
    if(purge_root.children)
        for(const child of purge_root.children)
            cnt += calcPurgeNodesCount(child)
    return cnt
}

function calcMidsCount(purge_root: PurgeTreeNode) {
    let cnt = 0
    if(purge_root.mids)
        cnt += purge_root.mids.length
    if(purge_root.children)
        for(const child of purge_root.children)
            cnt += calcMidsCount(child)
    return cnt
}

class DeletableWrapper
{
    static readonly finReg = new FinalizationRegistry<number>(wasmObject => _Deletable_delete(wasmObject))

    protected wasmObject: number

    constructor(wasmObject: number) {
        this.wasmObject = wasmObject
        DeletableWrapper.finReg.register(this, wasmObject, this)
    }

    delete(): void
    {
        DeletableWrapper.finReg.unregister(this)
        _Deletable_delete(this.wasmObject)
        this.wasmObject = 0
    }
}

export class CausalityGraph extends DeletableWrapper {
    private nMethods: number

    public constructor(nMethods: number, nTypes: number, data: CausalityGraphBinaryData) {
        const parameterFiles : ('typestates.bin' | 'interflows.bin' | 'direct_invokes.bin' | 'typeflow_methods.bin' | 'typeflow_filters.bin')[] = ['typestates.bin', 'interflows.bin', 'direct_invokes.bin', 'typeflow_methods.bin', 'typeflow_filters.bin']
        const filesAsNativeByteArrays = parameterFiles.map(name => {
            const arr = data[name]
            const ptr = Module._malloc(arr.length)
            Module.HEAPU8.subarray(ptr, ptr + arr.length).set(arr)
            return { ptr: ptr, len: arr.length }
        })

        const wasmObject = _CausalityGraph_init(nTypes,
            nMethods,
            ...filesAsNativeByteArrays.flatMap(span => [span.ptr, span.len]))

        for (const span of Object.values(filesAsNativeByteArrays))
            Module._free(span.ptr)

        super(wasmObject)
        this.nMethods = nMethods
    }

    public simulatePurge(nodesToBePurged: number[] = []): Uint8Array {
        const midsPtr = Module._malloc(nodesToBePurged.length * 4)
        const midsArray = Module.HEAPU32.subarray(midsPtr / 4, midsPtr / 4 + nodesToBePurged.length)

        for (let i = 0; i < nodesToBePurged.length; i++)
            midsArray[i] = nodesToBePurged[i] + 1

        const simulationResult = _CausalityGraph_simulatePurge(this.wasmObject, midsPtr, nodesToBePurged.length)
        Module._free(midsPtr)
        const methodHistoryPtr = _SimulationResult_getMethodHistory(simulationResult)
        const methodHistory = Module.HEAPU8.slice(methodHistoryPtr, methodHistoryPtr + this.nMethods)
        _Deletable_delete(simulationResult)
        return methodHistory
    }

    public simulatePurgeDetailed(nodesToBePurged: number[] = []): DetailedSimulationResult {
        const midsPtr = Module._malloc(nodesToBePurged.length * 4)
        const midsArray = Module.HEAPU32.subarray(midsPtr / 4, midsPtr / 4 + nodesToBePurged.length)

        for (let i = 0; i < nodesToBePurged.length; i++)
            midsArray[i] = nodesToBePurged[i] + 1

        const simulationResultPtr =
            _CausalityGraph_simulatePurgeDetailed(this.wasmObject, midsPtr, midsArray.length)
        Module._free(midsPtr)
        return new DetailedSimulationResult(this.nMethods, simulationResultPtr)
    }

    public simulatePurgesBatched(purge_root: PurgeTreeNode, resultCallback: (arg0: PurgeTreeNode, arg1: Uint8Array) => void, prepurgeMids: number[] = []) {
        if(purge_root.children.length === 0 && prepurgeMids.length === 0)
            return

        const purgeNodesCount = calcPurgeNodesCount(purge_root)

        const subsetsArrLen = (purgeNodesCount) * 4 /* {{ptr, len}, {child_ptr, child_len}} */
        const subsetsArrPtr = Module._malloc(subsetsArrLen * 4 /* (4 byte ptr/len) */)
        const subsetsArr = Module.HEAPU32.subarray(subsetsArrPtr / 4, subsetsArrPtr / 4 + subsetsArrLen)

        const midsCount = calcMidsCount(purge_root) + prepurgeMids.length

        const midsPtr = Module._malloc(midsCount * 4)
        let midsPos: number = midsPtr / 4

        const indexToInputNode = Array(purgeNodesCount)
        {
            let i = 1

            function layoutChildren(purge_root: PurgeTreeNode, offset: number) {
                indexToInputNode[offset] = purge_root
                const midsPos_start = midsPos

                const i_start = i

                if (purge_root.mids) {
                    if (purge_root.children) {
                        subsetsArr[i*4] /* ptr */ = midsPos * 4
                        subsetsArr[i*4 + 1] /* len */ = purge_root.mids.length
                        subsetsArr[i*4 + 2] = 0 // no children
                        subsetsArr[i*4 + 3] = 0 // no children
                        i++
                    }
                    for(const mid of purge_root.mids)
                        Module.HEAPU32[midsPos++] = mid + 1
                }

                let i_end = i

                if (purge_root.children) {
                    let local_i = i
                    i += purge_root.children.length
                    i_end = i
                    for (const child of purge_root.children) {
                        layoutChildren(child, local_i)
                        local_i++
                    }
                }

                const midsPos_end = midsPos

                const slice = subsetsArr.subarray(offset*4, (offset+1)*4)
                slice[0] = midsPos_start * 4
                slice[1] = midsPos_end - midsPos_start
                slice[2] = subsetsArrPtr + i_start * 16
                slice[3] = i_end - i_start
            }

            for (const mid of prepurgeMids)
                Module.HEAPU32[midsPos++] = mid + 1
            layoutChildren(purge_root, 0)
            // Also include prepurgeMids
            subsetsArr[0] = midsPtr
            subsetsArr[1] += prepurgeMids.length
        }

        const callback = (iteration: number, method_history_ptr: number) => {
            const inputNode = indexToInputNode[iteration]
            if (!inputNode)
                return;
            const still_reachable
                = Module.HEAPU8.subarray(method_history_ptr, method_history_ptr + this.nMethods)
            resultCallback(inputNode, still_reachable)
            return 0
        }

        const callback_ptr = Module.addFunction(callback, 'iii')
        const status = _CausalityGraph_simulatePurgesBatched(this.wasmObject, subsetsArrPtr, callback_ptr)
        Module.removeFunction(callback_ptr)

        Module._free(subsetsArrPtr)
        Module._free(midsPtr)

        if(status === 0)
            throw new Error('simulate_purges_batched exited with error')
    }
}

export interface ReachabilityHyperpathEdge {
    src: number
    dst: number
    via_type: number | undefined
}

export class DetailedSimulationResult extends DeletableWrapper {
    private nMethods: number

    constructor(nMethods: number, wasmObject: number) {
        super(wasmObject)
        this.nMethods = nMethods
    }

    getReachabilityHyperpath(mid: number): ReachabilityHyperpathEdge[] {
        const edgeBufPtr = _DetailedSimulationResult_getReachabilityHyperpath(this.wasmObject, mid+1)
        const edgeBufU32index = edgeBufPtr / Module.HEAPU32.BYTES_PER_ELEMENT
        const len = Module.HEAPU32.at(edgeBufU32index)
        const arr = Module.HEAPU32.subarray(edgeBufU32index + 1, edgeBufU32index + 1 + 3 * len)

        const edges = Array(len)

        for(let i = 0; i < edges.length; i++)
        {
            edges[i] = { src: arr[i*3] - 1, dst: arr[i*3+1] - 1 }
            const type = arr[i*3+2]
            if(type !== 0xFFFFFFFF)
                edges[i].via_type = type
        }

        Module._free(edgeBufPtr)

        return edges
    }

    getReachableArray(): Uint8Array {
        const methodHistoryPtr = _DetailedSimulationResult_getMethodHistory(this.wasmObject)
        return Module.HEAPU8.slice(methodHistoryPtr, methodHistoryPtr + this.nMethods)
    }
}