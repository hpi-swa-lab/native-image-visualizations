import { Node } from './Node'
import { Universe } from './Universe'
import * as Comlink from 'comlink'
import {UiAsyncCausalityGraph} from '../Causality/UiAsyncCausalityGraph';
import {AsyncCausalityGraph} from '../Causality/AsyncCausalityGraph';
import {ReachabilityJson} from '../parsing';

/*
 * Depending on whether the browser supports "module" script workers, Causality queries
 * are executed in a background worker or on the UI thread.
 */
function loadCausalityGraphConstructor():
    (nMethods: number, nTypes: number, causalityData: CausalityGraphData) =>
        Promise<AsyncCausalityGraph> {
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
        return (nMethods, nTypes, causalityData) =>
            new RemoteCausalityGraphWrapped(nMethods, nTypes, causalityData)
    } else {
        return (nMethods, nTypes, causalityData) =>
            new Promise((resolve) =>
                resolve(new UiAsyncCausalityGraph(nMethods, nTypes, causalityData)))
    }
}

const createCausalityGraph = loadCausalityGraphConstructor()


export interface CausalityGraphData {
    // Object structure of "reachability.json"
    reachabilityData: ReachabilityJson

    nodeLabels: string[]
    typeLabels: string[]

    // These binary blobs are handed to the wasm module
    'interflows.bin': Uint8Array
    'direct_invokes.bin': Uint8Array
    'typestates.bin': Uint8Array
    'typeflow_filters.bin': Uint8Array
    'typeflow_methods.bin': Uint8Array
}

export class CausalityGraphUniverse extends Universe {
    public readonly cgNodeLabels: string[]
    public readonly cgTypeLabels: string[]
    public readonly codesizeByCgNodeLabels: number[]

    public readonly causalityRoot: FullyHierarchicalNode

    private cgPromise: Promise<AsyncCausalityGraph> | AsyncCausalityGraph

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.cgNodeLabels = causalityData.nodeLabels
        this.cgTypeLabels = causalityData.typeLabels
        this.causalityRoot = generateHierarchyFromReachabilityJsonAndMethodList(
            causalityData.reachabilityData,
            causalityData.nodeLabels)

        const codesizesDict = getMethodCodesizeDictFromReachabilityJson(
            causalityData.reachabilityData)
        this.codesizeByCgNodeLabels = new Array(this.cgNodeLabels.length)
        for(let i = 0; i < this.cgNodeLabels.length; i++) {
            this.codesizeByCgNodeLabels[i] = codesizesDict[this.cgNodeLabels[i]] ?? 0
        }
        
        this.cgPromise = createCausalityGraph(
            causalityData.nodeLabels.length,
            causalityData.typeLabels.length, causalityData)
    }

    async getCausalityGraph() {
        // The promise may reference CausalityGraphData used for construction
        // Therefore we want to get rid of it ASAP
        return this.cgPromise = await this.cgPromise
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
    name: string // Displayed for this node
    parent: FullyHierarchicalNode | undefined
    children: FullyHierarchicalNode[]
    size: number
    accumulatedSize: number // transitive size of subtree

    fullname?: string // Displayed on hover. Does not contain the module/JAR/classpath name.

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

export function collectSubtree(v: FullyHierarchicalNode): FullyHierarchicalNode[] {
    const group: FullyHierarchicalNode[] = []
    forEachInSubtree(v, w => {
        group.push(w)
    })
    return group
}

export function collectCgNodesInSubtree(node: FullyHierarchicalNode): number[] {
    const group: number[] = []
    forEachInSubtree(node, u => {
        if(u.cgNode)
            group.push(u.cgNode)
    })
    return group
}

function computeCodesizePartialSum(root: FullyHierarchicalNode): number {
    let size = root.size
    for(const child of root.children)
        size += computeCodesizePartialSum(child)
    root.accumulatedSize = size
    return size
}

/*
 * The reachability.json and the causality export are loosely coupled:
 * While the reachability.json contains more information about code hierarchy, especially
 * Modules/JARs, and propeprties like whether a Module/JAR belongs to the "system" (JDK, Graal),
 * the causality export describes each causality graph node with a string label.
 *
 * The syntax of these labels depends on what event they describe:
 * Class got reachable:                  "<Package>.<Class>"
 * Class got instantiated:               "<Package>.<Class> [Instantiated]"
 * Class got registered for reflection:  "<Package>.<Class> [Reflection registration]"
 * Class got registered for JNI:         "<Package>.<Class> [JNI registration]"
 * Build-Time class initializer run:     "<Package>.<Class>.<clinit> [Build-Time]"
 *                                                          ^^^^^^^^
 *                                                          literally
 *
 * Unknown heap object of type found:    "<Package>.<Class> [Unknown Heap Object]"
 * Reachability callback ran:            "<Package>.<Class>@<hashCode> [Reachability Callback]"
 * Method got reachable:                 "<Package>.<Class>.<Method>(<Parameters>)"
 * Method got registered for reflection: "<Package>.<Class>.<Method>(<Parameters>) [Reflection registration]"
 * Method got registered for JNI:        "<Package>.<Class>.<Method>(<Parameters>) [JNI registration]"
 * Configuration file applied:           "<Path> [Configuration File]"
 *
 *
 * In particular, some of these events describe methods/classes that do not appear in the image
 * and therefore are not contained in the reachability.json.
 * To correlate these flat labels with our reachability.json-Hierarchy,
 * a trie is used that finds
 * - the method node for Method-related events,
 * - the class node for Class-related events,
 * - the longest common subpackage prefix for classes and methods not contained in the image,
 * - the top-level-source for configuration files by their path.
 */
function generateHierarchyFromReachabilityJsonAndMethodList(
        json: ReachabilityJson,
        cgNodeLabels: string[]) {
    const root: FullyHierarchicalNode = { children: [], size: 0, name: '', parent: undefined, accumulatedSize: 0 }
    const system: FullyHierarchicalNode = { children: [], name: 'system', size: 0, parent: root, accumulatedSize: 0 }
    const user: FullyHierarchicalNode = { children: [], name: 'user', size: 0, parent: root, accumulatedSize: 0 }
    const main: FullyHierarchicalNode = { children: [], name: 'main', size: 0, parent: root, accumulatedSize: 0 }

    const trie = new Trie<FullyHierarchicalNode & { fullname: string }>()

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
            parent: undefined,
            accumulatedSize: 0,
        }

        if (toplevel.path) {
            trie.add(toplevel.path, l1)
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
                            size: 0,
                            accumulatedSize: 0
                        }
                        /* Eigentlich sollten keine Causality-Graph-Knoten direkt in einem Package
                         * Es gibt jedoch Knoten für Klassen, die nicht reachable sind
                         * (z.B. Build-Time-Features).
                         * Diese müssen unbedingt in die Abschneide-Berechnung miteinbezogen werden.
                         * Idealerweise sollten sie auch in der Baumstruktur auftauchen.
                         * Das ist aber gerade noch zu kompliziert umzusetzen... */
                        trie.add(newNode.fullname, newNode)
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
                    parent: l2,
                    accumulatedSize: 0
                }

                if(type.flags?.includes('synthetic'))
                    l3.synthetic = true
                trie.add(l3.fullname, l3)
                l2.children.push(l3)

                for (const [methodName, method] of Object.entries(type.methods)) {
                    const l4: FullyHierarchicalNode & { fullname: string } = {
                        fullname: l3.fullname + '.' + methodName,
                        name: methodName,
                        children: [],
                        size: method.size,
                        parent: l3,
                        accumulatedSize: 0
                    }
                    if(method.flags?.includes('synthetic'))
                        l4.synthetic = true
                    trie.add(l4.fullname, l4)
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
                        parent: curNode,
                        accumulatedSize: 0
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
                    parent: curNode,
                    accumulatedSize: 0
                }
                curNode.children.push(newNode)
                trie.add(newNode.fullname, newNode)
            }
        }
    }

    if(user.children.length)
        root.children.push(user)
    if(system.children.length)
        root.children.push(system)
    if(main.children.length)
        root.children.push(main)

    computeCodesizePartialSum(root)

    return root
}
