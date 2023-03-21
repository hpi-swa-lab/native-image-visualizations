import { Node } from './Node'
import { Universe } from './Universe'
import {
    AsyncCausalityGraph,
    loadCausalityGraphConstructor
} from '../Causality/AsyncCausalityGraph'
import { ReachabilityJson } from '../parsing'
import { CausalityGraphBinaryData } from '../Causality/CausalityGraphBinaryData'

const createCausalityGraph = loadCausalityGraphConstructor()

export interface CausalityGraphData extends CausalityGraphBinaryData {
    // Object structure of "reachability.json"
    reachabilityData: ReachabilityJson

    nodeLabels: string[]
    typeLabels: string[]
}

export class CausalityGraphUniverse extends Universe {
    public readonly nodeLabels: string[]
    public readonly typeLabels: string[]
    public readonly codesizeByNodeLabels: number[]

    public readonly causalityRoot: FullyHierarchicalNode

    private cgPromise: Promise<AsyncCausalityGraph> | AsyncCausalityGraph

    constructor(name: string, root: Node, causalityData: CausalityGraphData) {
        super(name, root)
        this.nodeLabels = causalityData.nodeLabels
        this.typeLabels = causalityData.typeLabels
        this.causalityRoot = generateHierarchyFromReachabilityJsonAndMethodList(
            causalityData.reachabilityData,
            causalityData.nodeLabels
        )

        const codesizesDict = getMethodCodesizeDictFromReachabilityJson(
            causalityData.reachabilityData
        )
        this.codesizeByNodeLabels = new Array(this.nodeLabels.length)
        this.codesizeByNodeLabels = this.nodeLabels.map((element) => codesizesDict[element] ?? 0)

        this.cgPromise = createCausalityGraph(
            causalityData.nodeLabels.length,
            causalityData.typeLabels.length,
            causalityData
        )
    }

    async getCausalityGraph() {
        // The promise may reference CausalityGraphData used for construction
        // Therefore we want to get rid of it ASAP
        return (this.cgPromise = await this.cgPromise)
    }
}

class TrieNode<Value> {
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
            if (!node) return val
            if (node.val) val = node.val
        }
        return val
    }
}

export enum NodeType {
    CustomCategory,
    Module,
    Package,
    Class,
    Method,
    CgOnly
}

/* Integrating this with 'Node' currently would break constant-depth guarantees:
 * 1. Packages are organized by their dot-separated prefixes
 * 2. Modules can have reflection-configs as their children
 * 3. Classes can have events "[Reflection registration]", "[Instantiated]", etc. as their children
 */
export interface FullyHierarchicalNode {
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
    type: NodeType
}

export function forEachInSubtree<TNode extends { children?: TNode[] }>(
    node: TNode,
    callback: (v: TNode) => unknown
) {
    const stack: TNode[] = []
    stack.push(node)
    let u
    while ((u = stack.pop())) {
        const handled = callback(u)
        if (u.children && !handled) stack.push(...u.children)
    }
}

export function collectSubtree(v: FullyHierarchicalNode): FullyHierarchicalNode[] {
    const group: FullyHierarchicalNode[] = []
    forEachInSubtree(v, (w) => {
        group.push(w)
    })
    return group
}

export function collectCgNodesInSubtree(node: FullyHierarchicalNode): number[] {
    const group: number[] = []
    forEachInSubtree(node, (u) => {
        if (u.cgNode) group.push(u.cgNode)
    })
    return group
}

function computeCodesizePartialSum(root: FullyHierarchicalNode): number {
    let size = root.size
    for (const child of root.children) size += computeCodesizePartialSum(child)
    root.accumulatedSize = size
    return size
}

/* eslint-disable vue/max-len */
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

// The keys of the returned dict have to exactly match the notation of causality node labels
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

function generateHierarchyFromReachabilityJsonAndMethodList(
    json: ReachabilityJson,
    cgNodeLabels: string[]
) {
    const root: FullyHierarchicalNode = {
        children: [],
        size: 0,
        name: '',
        parent: undefined,
        accumulatedSize: 0,
        type: NodeType.CustomCategory
    }
    const system: FullyHierarchicalNode = {
        children: [],
        name: 'runtime components',
        size: 0,
        parent: root,
        accumulatedSize: 0,
        type: NodeType.CustomCategory
    }
    const user: FullyHierarchicalNode = {
        children: [],
        name: 'user application and dependencies',
        size: 0,
        parent: root,
        accumulatedSize: 0,
        type: NodeType.CustomCategory
    }
    const main: FullyHierarchicalNode = {
        children: [],
        name: 'main',
        size: 0,
        parent: root,
        accumulatedSize: 0,
        type: NodeType.CustomCategory
    }

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
                displayPath = displayPath.substring(index + 1)
            }
        }

        if (toplevel.path && toplevel.module) {
            l1name = displayPath + ':' + toplevel.module
            l1fullname = toplevel.path + ':' + toplevel.module
        } else if (displayPath && toplevel.path) {
            l1name = displayPath
            l1fullname = toplevel.path
        } else if (toplevel.module) {
            l1name = toplevel.module
            l1fullname = toplevel.module
        }

        const l1: FullyHierarchicalNode & { fullname: string } = {
            children: [],
            name: l1name,
            fullname: l1fullname,
            size: 0,
            parent: undefined,
            accumulatedSize: 0,
            type: NodeType.Module
        }

        if (toplevel.path) {
            trie.add(toplevel.path, l1)
        }

        for (const [packageName, pkg] of Object.entries(toplevel.packages)) {
            let prefix = ''
            let l2: FullyHierarchicalNode = l1

            if (packageName.length !== 0) {
                for (const subPackageName of packageName.split('.')) {
                    prefix += subPackageName + '.'
                    let next = l2.children.find((n) => n.name === subPackageName)
                    if (!next) {
                        const newNode = {
                            children: [],
                            fullname: prefix,
                            name: subPackageName,
                            parent: l2,
                            size: 0,
                            accumulatedSize: 0,
                            type: NodeType.Package
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
                    accumulatedSize: 0,
                    type: NodeType.Class
                }

                if (type.flags?.includes('synthetic')) l3.synthetic = true
                trie.add(l3.fullname, l3)
                l2.children.push(l3)

                for (const [methodName, method] of Object.entries(type.methods)) {
                    const l4: FullyHierarchicalNode & { fullname: string } = {
                        fullname: l3.fullname + '.' + methodName,
                        name: methodName,
                        children: [],
                        size: method.size,
                        parent: l3,
                        accumulatedSize: 0,
                        type: NodeType.Method
                    }
                    if (method.flags?.includes('synthetic')) l4.synthetic = true
                    trie.add(l4.fullname, l4)
                    l3.children.push(l4)

                    const flags = method.flags
                    if (flags && flags.includes('main')) {
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
                while (true) {
                    const dotIndex = name.indexOf('.')
                    if (dotIndex === -1) break

                    const semanticBreakoutSymbols = ['(', '[', '/']
                    const semanticBreakoutIndexes = semanticBreakoutSymbols.map((s) =>
                        name.indexOf(s)
                    )
                    if (semanticBreakoutIndexes.some((i) => i !== -1 && i < dotIndex)) break

                    const newNode = {
                        cgOnly: true,
                        fullname: cgNodeName.substring(0, offset + dotIndex),
                        name: name.substring(0, dotIndex),
                        children: [],
                        size: 0,
                        parent: curNode,
                        accumulatedSize: 0,
                        type: NodeType.CgOnly
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
                    name = name.substring(pathSepIndex + 1)
                }

                const newNode = {
                    cgOnly: true,
                    fullname: cgNodeName,
                    name: name,
                    cgNode: i,
                    children: [],
                    size: 0,
                    parent: curNode,
                    accumulatedSize: 0,
                    type: NodeType.CgOnly
                }
                curNode.children.push(newNode)
                trie.add(newNode.fullname, newNode)
            }
        }
    }

    if (user.children.length) root.children.push(user)
    if (system.children.length) root.children.push(system)
    if (main.children.length) root.children.push(main)

    computeCodesizePartialSum(root)

    return root
}
