import { Node } from './Node'
import { Universe } from './Universe'
import * as Comlink from 'comlink'
import {UiAsyncCausalityGraph} from '../Causality/UiAsyncCausalityGraph';
import {AsyncCausalityGraph} from '../Causality/AsyncCausalityGraph';

let createCausalityGraph: (nMethods: number, nTypes: number, causalityData: CausalityGraphData)
    => Promise<AsyncCausalityGraph> | AsyncCausalityGraph

{
    let workerCreated = false;
    const tester = {
        get type(): 'module' {
            workerCreated = true;
            return 'module'
        } // it's been called, it's supported
    };
    const worker = new Worker('/src/ts/Causality/RemoteCausalityGraph', tester);

    if (workerCreated) {
        const RemoteCausalityGraphWrapped = Comlink.wrap(worker) as unknown as {
            new(
                nMethods: number,
                nTypes: number,
                causalityData: CausalityGraphData): Promise<AsyncCausalityGraph>
        }
        createCausalityGraph = (nMethods, nTypes, causalityData) =>
            new RemoteCausalityGraphWrapped(nMethods, nTypes, causalityData)
    } else {
        createCausalityGraph = (nMethods, nTypes, causalityData) =>
            new UiAsyncCausalityGraph(nMethods, nTypes, causalityData)
    }
}

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
    public cgNodeLabels: string[]
    public cgTypeLabels: string[]
    public codesizeByCgNodeLabels: number[]

    public causalityRoot: FullyHierarchicalNode

    private cgPromise: Promise<AsyncCausalityGraph> | AsyncCausalityGraph

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.cgNodeLabels = causalityData.methodList
        this.cgTypeLabels = causalityData.typeList
        this.causalityRoot = generateHierarchyFromReachabilityJsonAndMethodList(
            causalityData.reachabilityData,
            causalityData.methodList)

        const codesizesDict = getMethodCodesizeDictFromReachabilityJson(
            causalityData.reachabilityData)
        this.codesizeByCgNodeLabels = new Array(this.cgNodeLabels.length)
        for(let i = 0; i < this.cgNodeLabels.length; i++) {
            this.codesizeByCgNodeLabels[i] = codesizesDict[this.cgNodeLabels[i]] ?? 0
        }
        
        this.cgPromise = createCausalityGraph(
            causalityData.methodList.length,
            causalityData.typeList.length, causalityData)
    }

    async getCausalityGraph() {
        return await this.cgPromise
    }
}



function getMethodCodesizeDictFromReachabilityJson(data: ReachabilityJson) {
    const dict: { [fullyQualifiedName: string]: number } = {}

    for (const toplevel of data) {
        for (const [packageName, pkg] of Object.entries(toplevel.packages)) {
            for (const [typeName, type] of Object.entries(pkg.types)) {
                for (const [methodName, method] of Object.entries(type.methods)) {
                    const fullyQualifiedName = `${packageName}.${typeName}.${methodName}`
                    dict[fullyQualifiedName] = method.size
                }
            }
        }
    }

    return dict
}

class TrieNode<Value>
{
    val?: Value
    next: { [c: string]: TrieNode<Value> } = {}
}

class Trie<Value> {
    root = new TrieNode<Value>()

    constructor(dict: { [name: string]: Value }) {
        for (const [k, v] of Object.entries(dict))
            this.add(k, v)
    }

    add(key: string, value: Value) {
        let node: TrieNode<Value> = this.root
        for (const c of key) {
            node = node.next[c] ??= new TrieNode<Value>()
        }
        node.val = value
    }

    find(str: string) {
        let node = this.root
        let val = undefined
        for (const c of str) {
            node = node.next[c]
            if (!node)
                return val
            if (node.val)
                val = node.val
        }
        return val
    }
}

export interface FullyHierarchicalNode
{
    name: string
    parent: FullyHierarchicalNode | undefined
    children: FullyHierarchicalNode[]
    size: number // transitive size of subtree

    fullname?: string

    main?: boolean
    synthetic?: boolean

    cgOnly?: boolean
    cgNode?: number
}


export function forEachInSubtree
        <TNode extends { children?: TNode[] }>
        (node: TNode, callback: (v: TNode) => unknown) {
    const stack: TNode[] = []
    stack.push(node)
    while (stack.length > 0) {
        const u = stack.pop()!
        const handled = callback(u)
        if (u.children && !handled)
            stack.push(...u.children)
    }
}

export function collectCgNodesInSubtree(node: FullyHierarchicalNode): number[] {
    const group: number[] = []
    forEachInSubtree(node, u => {
        if(u.cgNode)
            group.push(u.cgNode)
    })
    return group
}

function computeCodesizePartialSum(root: FullyHierarchicalNode) {
    for(const child of root.children) {
        computeCodesizePartialSum(child)
        root.size += child.size
    }
}

function generateHierarchyFromReachabilityJsonAndMethodList(
        json: ReachabilityJson,
        cgNodeLabels: string[]) {
    const dict: FullyHierarchicalNode = { children: [], size: 0, name: '', parent: undefined }
    const system: FullyHierarchicalNode = { children: [], name: 'system', size: 0, parent: dict }
    const user: FullyHierarchicalNode = { children: [], name: 'user', size: 0, parent: dict }
    const main: FullyHierarchicalNode = { children: [], name: 'main', size: 0, parent: dict}

    const prefixToNode: { [prefix: string]: FullyHierarchicalNode & { fullname: string } } = {}

    for (const toplevel of json) {
        let l1name = 'ϵ'
        let l1fullname = ''
        const isSystem = toplevel.flags && toplevel.flags.includes('system')
        let containsMain = false

        let displayPath = toplevel.path
        if (displayPath && displayPath.endsWith('.jar')) {
            const index = displayPath.lastIndexOf('/')
            if (index !== -1) {
                displayPath = displayPath.substring(index+1)
            }
        }

        if (toplevel.path && toplevel.module) {
            l1name = displayPath + ':' + toplevel.module
            l1fullname = toplevel.path + ':' + toplevel.module
        } else if(displayPath && toplevel.path) {
            l1name = displayPath
            l1fullname = toplevel.path
        } else if(toplevel.module) {
            l1name = toplevel.module
            l1fullname = toplevel.module
        }

        const l1: FullyHierarchicalNode & {fullname: string} = {
            children: [],
            name: l1name,
            fullname: l1fullname,
            size: 0,
            parent: undefined
        }

        if (toplevel.path) {
            prefixToNode[toplevel.path] = l1
        }

        for (const [packageName, pkg] of Object.entries(toplevel.packages)) {
            let prefix = ''
            let l2: FullyHierarchicalNode = l1

            if(packageName.length !== 0) {
                for (const subPackageName of packageName.split('.')) {
                    prefix += subPackageName + '.'
                    let next = l2.children.find(n => n.name === subPackageName)
                    if(!next) {
                        const newNode = {
                            children: [],
                            fullname: prefix,
                            name: subPackageName,
                            parent: l2,
                            size: 0
                        }
                        /* Eigentlich sollten keine Causality-Graph-Knoten direkt in einem Package
                         * Es gibt jedoch Knoten für Klassen, die nicht reachable sind
                         * (z.B. Build-Time-Features).
                         * Diese müssen unbedingt in die Abschneide-Berechnung miteinbezogen werden.
                         * Idealerweise sollten sie auch in der Baumstruktur auftauchen.
                         * Das ist aber gerade noch zu kompliziert umzusetzen... */
                        prefixToNode[newNode.fullname] = newNode
                        l2.children.push(newNode)
                        next = newNode
                    }
                    l2 = next
                }
            }

            for (const [typeName, type] of Object.entries(pkg.types)) {
                const l3: FullyHierarchicalNode & { fullname: string } = {
                    fullname: prefix + typeName,
                    name: typeName,
                    children: [],
                    size: 0,
                    parent: l2
                }

                if(type.flags?.includes('synthetic'))
                    l3.synthetic = true
                prefixToNode[l3.fullname] = l3
                l2.children.push(l3)

                for (const [methodName, method] of Object.entries(type.methods)) {
                    const l4: FullyHierarchicalNode & { fullname: string } = {
                        fullname: l3.fullname + '.' + methodName,
                        name: methodName,
                        children: [],
                        size: method.size,
                        parent: l3
                    }
                    if(method.flags?.includes('synthetic'))
                        l4.synthetic = true
                    prefixToNode[l4.fullname] = l4
                    l3.children.push(l4)

                    const flags = method.flags
                    if(flags && flags.includes('main')) {
                        l4.main = true
                        containsMain = true
                    }
                }
            }
        }

        const l0: FullyHierarchicalNode = containsMain ? main : isSystem ? system : user
        l0.children.push(l1)
        l1.parent = l0
    }

    const trie = new Trie<FullyHierarchicalNode & { fullname: string }>(prefixToNode)

    for (let i = 0; i < cgNodeLabels.length; i++) {
        const cgNodeName = cgNodeLabels[i]
        const node = trie.find(cgNodeName)
        if (node) {
            if (node.fullname === cgNodeName) {
                // Methods that only differ in return type break this.
                // Pretending this won't happen...
                // assert(node.cgNode === undefined)
                node.cgNode = i
            } else {
                let curNode = node
                let offset = node.fullname.length
                let name = cgNodeName.substring(offset).trimStart()
                if (name.startsWith('.')) {
                    offset += 1
                    name = name.substring(1)
                }
                while(true) {
                    const dotIndex = name.indexOf('.')
                    if(dotIndex === -1)
                        break;

                    const semanticBreakoutSymbols = ['(', '[', '/']
                    const semanticBreakoutIndexes =
                        semanticBreakoutSymbols.map(s => name.indexOf(s))
                    if(semanticBreakoutIndexes.some(i => i !== -1 && i < dotIndex))
                        break

                    const newNode = {
                        cg_only: true,
                        fullname: cgNodeName.substring(0, offset + dotIndex),
                        name: name.substring(0, dotIndex),
                        children: [],
                        size: 0,
                        parent: curNode
                    }
                    curNode.children.push(newNode)
                    trie.add(newNode.fullname, newNode)

                    offset += dotIndex + 1
                    name = name.substring(dotIndex + 1)
                    curNode = newNode
                }

                // Handle ".../reflect-config.json"
                const pathSepIndex = name.lastIndexOf('/')
                if (pathSepIndex !== -1) {
                    name = name.substring(pathSepIndex+1)
                }

                const newNode = {
                    cg_only: true,
                    fullname: cgNodeName,
                    name: name,
                    cgNode: i,
                    children: [],
                    size: 0,
                    parent: curNode
                }
                curNode.children.push(newNode)
                trie.add(newNode.fullname, newNode)
            }
        }
    }

    if(user.children.length)
        dict.children.push(user)
    if(system.children.length)
        dict.children.push(system)
    if(main.children.length)
        dict.children.push(main)

    computeCodesizePartialSum(dict)

    return dict
}
