import loadWASM from './lib/causality_graph.js'

const Module: any = await loadWASM()


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

type WasmLiteral = 'number' | 'string' | 'void'
type TypeFromLiteral<T extends WasmLiteral> = T extends 'number' ? number : T extends 'string' ? string : void
type TypesFromLiterals<Tuple extends [...WasmLiteral[]]> = {
    [Index in keyof Tuple]: TypeFromLiteral<Tuple[Index]>;
} & {length: Tuple['length']};

class WasmObjectWrapper
{
    private static readonly _delete = Module.cwrap('Deletable_delete', 'void', ['number'])
    private static readonly finReg = new FinalizationRegistry<number>(wasmObject => WasmObjectWrapper._delete(wasmObject))

    private wasmObject: number

    constructor(wasmObject: number) {
        this.wasmObject = wasmObject
        WasmObjectWrapper.finReg.register(this, wasmObject, this)
    }

    protected static instanceCWrap<TReturnLiteral extends WasmLiteral, TArgLiterals extends [...WasmLiteral[]]>
            (funcname: string, returnType: TReturnLiteral, argTypes: TArgLiterals):
            (thisPtr: WasmObjectWrapper, ...args: TypesFromLiterals<TArgLiterals>) => TypeFromLiteral<TReturnLiteral> {
        const fun = Module.cwrap(funcname, returnType, ['number', ...argTypes])
        return (thisPtr: WasmObjectWrapper, ...args: TypesFromLiterals<TArgLiterals>) => {
            if(thisPtr.wasmObject === 0)
                throw new Error('Attempted to use native (wasm) object after deletion!')
            return fun(thisPtr.wasmObject, ...args)
        }
    }

    delete(): void
    {
        WasmObjectWrapper.finReg.unregister(this)
        WasmObjectWrapper._delete(this.wasmObject)
        this.wasmObject = 0
    }
}

export class CausalityGraph extends WasmObjectWrapper {
    private static readonly _init = Module.cwrap('CausalityGraph_init', 'number', Array(12).fill('number'));
    private static readonly _simulatePurge = WasmObjectWrapper.instanceCWrap<'number', ['number', 'number']>('CausalityGraph_simulatePurge', 'number', ['number', 'number'])
    private static readonly _simulatePurgeDetailed = WasmObjectWrapper.instanceCWrap<'number', ['number', 'number']>('CausalityGraph_simulatePurgeDetailed', 'number', ['number', 'number'])
    private static readonly _simulatePurgesBatched = WasmObjectWrapper.instanceCWrap<'number', ['number', 'number']>('CausalityGraph_simulatePurgesBatched', 'number', ['number', 'number'])

    private nMethods: number

    public constructor(nMethods: number, nTypes: number, data: CausalityGraphBinaryData) {
        const parameterFiles : ('typestates.bin' | 'interflows.bin' | 'direct_invokes.bin' | 'typeflow_methods.bin' | 'typeflow_filters.bin')[] = ['typestates.bin', 'interflows.bin', 'direct_invokes.bin', 'typeflow_methods.bin', 'typeflow_filters.bin']
        const filesAsNativeByteArrays = parameterFiles.map(name => {
            const arr = data[name]
            const ptr = Module._malloc(arr.length)
            Module.HEAPU8.subarray(ptr, ptr + arr.length).set(arr)
            return { ptr: ptr, len: arr.length }
        })

        const wasmObject = CausalityGraph._init(nTypes,
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

        const simulationResultPtr = CausalityGraph._simulatePurge(this, midsPtr, nodesToBePurged.length)
        Module._free(midsPtr)
        const simulationResult = new SimulationResult(this.nMethods, simulationResultPtr)
        const methodHistory = simulationResult.getReachableArray()
        simulationResult.delete()
        return methodHistory
    }

    public simulatePurgeDetailed(nodesToBePurged: number[] = []): DetailedSimulationResult {
        const midsPtr = Module._malloc(nodesToBePurged.length * 4)
        const midsArray = Module.HEAPU32.subarray(midsPtr / 4, midsPtr / 4 + nodesToBePurged.length)

        for (let i = 0; i < nodesToBePurged.length; i++)
            midsArray[i] = nodesToBePurged[i] + 1

        const simulationResultPtr =
            CausalityGraph._simulatePurgeDetailed(this, midsPtr, midsArray.length)
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
        const status = CausalityGraph._simulatePurgesBatched(this, subsetsArrPtr, callback_ptr)
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

class SimulationResult extends WasmObjectWrapper {
    private static readonly _getMethodHistory = WasmObjectWrapper.instanceCWrap('SimulationResult_getMethodHistory', 'number', [])

    protected nMethods: number

    constructor(nMethods: number, wasmObject: number) {
        super(wasmObject)
        this.nMethods = nMethods
    }

    getReachableArray(): Uint8Array {
        const methodHistoryPtr = SimulationResult._getMethodHistory(this)
        return Module.HEAPU8.slice(methodHistoryPtr, methodHistoryPtr + this.nMethods)
    }
}

export class DetailedSimulationResult extends SimulationResult {
    private static readonly _getReachabilityHyperpath = WasmObjectWrapper.instanceCWrap('DetailedSimulationResult_getReachabilityHyperpath', 'number', ['number'])

    constructor(nMethods: number, wasmObject: number) {
        super(nMethods, wasmObject)
    }

    getReachabilityHyperpath(mid: number): ReachabilityHyperpathEdge[] {
        const edgeBufPtr = DetailedSimulationResult._getReachabilityHyperpath(this, mid+1)
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
}