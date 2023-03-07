import * as d3 from 'd3'
import * as d3dag from 'd3-dag'
import {RemoteCausalityGraph} from '../Causality/RemoteCausalityGraph';
import {Remote} from 'comlink';
import {
    DetailedSimulationResult, IncrementalSimulationResult,
    PurgeTreeNode,
    ReachabilityHyperpathEdge,
    RecursiveNode
} from '../Causality/CausalityGraph';
import {CausalityGraphUniverse, ReachabilityJson} from '../UniverseTypes/CausalityGraphUniverse';

function assert(cond: unknown) {
    if(!cond)
        throw new Error('Assertion failed!')
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

interface TrieNode<Value>
{
    val?: Value
    next: { [c: string]: TrieNode<Value> }
}

class Trie<Value> {
    root: TrieNode<Value> = { next: {} }

    constructor(dict: { [name: string]: Value }) {
        for (const [k, v] of Object.entries(dict))
            this.add(k, v)
    }

    add(key: string, value: Value) {
        let node: TrieNode<Value> = this.root
        for (const c of key) {
            if (!node.next[c]) {
                node.next[c] = { next: {} }
            }
            node = node.next[c]
        }
        node.val = value
    }

    find(str: string) {
        let node = this.root
        let val = undefined
        for (const c of str) {
            if (!node.next[c])
                return val
            node = node.next[c]
            if (node.val)
                val = node.val
        }
        return val
    }
}

interface InternalNode
{
    parent: InternalNode | undefined
    exact_cg_node?: number
    main?: boolean
    cg_nodes: number[]
    fullname?: string
    name: string
    children: InternalNode[]
    size: number // transitive size of subtree
    cg_only?: boolean
}

function generateHierarchyFromReachabilityJsonAndMethodList(json: ReachabilityJson, cgNodes: string[]) {
    const dict: InternalNode = { children: [], cg_nodes: [], size: 0, name: '', parent: undefined }
    const system: InternalNode = { children: [], cg_nodes: [], name: 'system', size: 0, parent: dict }
    const user: InternalNode = { children: [], cg_nodes: [], name: 'user', size: 0, parent: dict }
    const main: InternalNode = { children: [], cg_nodes: [], name: 'main', size: 0, parent: dict}

    const prefixToNode: { [prefix: string]: InternalNode & { fullname: string } } = {}

    for (const toplevel of json) {
        let l1name = 'ϵ'
        let l1fullname = ''
        const isSystem = toplevel.flags && toplevel.flags.includes('system')

        let display_path = toplevel.path
        if (display_path && display_path.endsWith('.jar')) {
            const index = display_path.lastIndexOf('/')
            if (index !== -1) {
                display_path = display_path.substring(index+1)
            }
        }

        if (toplevel.path && toplevel.module) {
            l1name = display_path + ':' + toplevel.module
            l1fullname = toplevel.path + ':' + toplevel.module
        } else if(display_path && toplevel.path) {
            l1name = display_path
            l1fullname = toplevel.path
        } else if(toplevel.module) {
            l1name = toplevel.module
            l1fullname = toplevel.module
        }

        const l1 = { children: [], name: l1name, fullname: l1fullname, cg_nodes: [], system: isSystem, size: 0, parent: isSystem ? system : user }
        if (toplevel.path) {
            prefixToNode[toplevel.path] = l1
        }

        if(isSystem)
            system.children.push(l1)
        else
            user.children.push(l1)

        for (const [packageName, pkg] of Object.entries(toplevel.packages)) {
            let prefix = ''
            let l2: InternalNode = l1

            if(packageName.length !== 0) {
                for (const subPackageName of packageName.split('.')) {
                    prefix += subPackageName + '.'
                    let next = l2.children.find(n => n.name === subPackageName)
                    if(!next) {
                        const newNode = { children: [], fullname: prefix, name: subPackageName, cg_nodes: [], parent: l2, size: 0 }
                        /* Eigentlich sollten keine Causality-Graph-Knoten direkt in einem Package hängen.
                         * Es gibt jedoch Knoten für Klassen, die nicht reachable sind (z.B. Build-Time-Features).
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
                const l3: InternalNode & { fullname: string } = { fullname: prefix + typeName, name: typeName, cg_nodes: [], children: [], size: 0, parent: l2 }
                prefixToNode[l3.fullname] = l3
                l2.children.push(l3)

                for (const [methodName, method] of Object.entries(type.methods)) {
                    const l4: InternalNode & { fullname: string } = { fullname: l3.fullname + '.' + methodName, name: methodName, cg_nodes: [], children: [], size: method.size, parent: l3 }
                    prefixToNode[l4.fullname] = l4
                    l3.children.push(l4)

                    const flags = method.flags
                    if(flags && flags.includes('main')) {
                        l4.main = true
                        assert(main.children.length === 0)
                        user.children = user.children.filter(c => c !== l1)
                        main.children.push(l1)
                        l1.parent = main
                    }

                    for(let cur = l4.parent; cur; cur = cur.parent) {
                        cur.size += method.size
                    }
                }
            }
        }
    }

    const trie = new Trie<InternalNode & { fullname: string }>(prefixToNode)

    for (let i = 0; i < cgNodes.length; i++) {
        const cgNodeName = cgNodes[i]
        const node = trie.find(cgNodeName)
        if (node) {
            if (node.fullname === cgNodeName) {
                node.exact_cg_node = i
                node.cg_nodes.push(i)
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
                    const semanticChangingSymbols = ['(', '[', '/']
                    const semanticChangingIndexes = semanticChangingSymbols.map(s => name.indexOf(s))

                    if(dotIndex !== -1 && semanticChangingIndexes.every(i => i === -1 || i > dotIndex)) {
                    } else {
                        break
                    }

                    const newNode = { cg_only: true, fullname: cgNodeName.substring(0, offset + dotIndex), name: name.substring(0, dotIndex), cg_nodes: [], children: [], size: 0, parent: curNode }
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

                const newNode = { cg_only: true, fullname: cgNodeName, name: name, cg_nodes: [i], exact_cg_node: i, children: [], size: 0, parent: curNode }
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

    return dict
}

function formatByteSizesWithUnitPrefix(size: number) {
    if(size > 1000000)
        return (size / 1000000).toPrecision(3) + ' MB'
    else if(size > 1000)
        return (size / 1000).toPrecision(3) + ' KB'
    else
        return size.toPrecision(3) + ' B'
}

function forEachInSubtree<TNode extends { children?: TNode[] }>(node: TNode, callback: (v: TNode) => unknown) {
    const stack: TNode[] = []
    stack.push(node)
    while (stack.length > 0) {
        const u = stack.pop()!
        const handled = callback(u)
        if (u.children && !handled)
            stack.push(...u.children)
    }
}

function forEachInSubtreePostorder<TNode extends { children?: TNode[] }>(node: TNode, expandCallback: (v: TNode) => boolean, callback: (v: TNode) => void) {
    if(!expandCallback(node))
        return
    if(node.children)
        for(const c of node.children)
            forEachInSubtreePostorder(c, expandCallback, callback)
    callback(node)
}

function forEachInStrictSubtreePostorder<TNode extends { children?: TNode[] }>(node: TNode, expandCallback: (v: TNode) => boolean, callback: (v: TNode) => void) {
    if(node.children)
        for(const c of node.children)
            forEachInSubtreePostorder(c, expandCallback, callback)
}

function collectCgNodesInSubtree(node: InternalNode): number[] {
    const group: number[] = []
    forEachInSubtree(node, u => {
        if (u.cg_nodes)
            group.push(...u.cg_nodes)
    })
    return group
}









function expandClickHandler(element: HTMLElement, node: InternalNode, populateCallback: () => void) {
    const expanded = element.classList.toggle('caret-down');

    if(!element.parentElement!.querySelector('.nested') && expanded) {
        populateCallback()
    }

    element.parentElement!.querySelector('.nested')!.classList.toggle('active');
}

function getUnqualifiedCausalityGraphNodeName(fullyQualifiedName: string): string {
    const parenIndex = fullyQualifiedName.lastIndexOf('/')
    if (parenIndex !== -1)
        fullyQualifiedName = fullyQualifiedName.substring(parenIndex + 1)
    return fullyQualifiedName.replaceAll(/(?<![A-Za-z0-9])([a-z]\w+\.)+/g, '')
}

function getColorAccordingToCausalityGraphNodeType(fullyQualifiedName: string): string {
    if(fullyQualifiedName.endsWith('[Instantiated]'))
        return '#FF4040'
    if(fullyQualifiedName.endsWith('[Reflection Registration]'))
        return '#D0A000'
    if(fullyQualifiedName.endsWith('[JNI Registration]'))
        return '#904040'
    if(fullyQualifiedName.endsWith('[Configuration File]'))
        return '#505050'
    if(fullyQualifiedName.endsWith('[Initial Registrations]'))
        return '#C0C0C0'
    if(fullyQualifiedName.endsWith('[User-Requrested Feature Registration'))
        return '#808080'
    if(fullyQualifiedName.endsWith('[Automatic Feature Registration]'))
        return '#A0A0A0'
    if(fullyQualifiedName.endsWith('[Unknown Heap Object]'))
        return '#1010E0'
    if(fullyQualifiedName.endsWith('[Build-Time]'))
        return '#4040FF'
    if(fullyQualifiedName.endsWith('[Reachability Callback]'))
        return '#E0E000'
    if(fullyQualifiedName.includes('(')) // Method reachable
        return '#20C020'

    // Class reachable
    return '#40A0DF'
}

interface ReachabilityVector
{
    arr: Uint8Array
    size: number
}

interface CutViewData
{
    html: HTMLLIElement
    reachable_after_cutting_this: undefined | ReachabilityVector
    reachable_after_additionally_cutting_this: undefined | ReachabilityVector
}

interface ImageViewData
{
    html: HTMLLIElement
    exclusive_transitive_cg_nodes?: number[]
    purgedCodesize?: number
}

class Cutview {

}

class Imageview {

}


function getDataRoot(node: InternalNode) {
    let cur: InternalNode
    for(cur = node; cur.parent; cur = cur.parent);
    return cur
}

function createPurgeNodeTree2(nodes: Set<InternalNode>, prepurgeNodes = new Set<InternalNode>()): [ PurgeTreeNode<number> | undefined, (InternalNode | undefined)[] ] {
    if(nodes.size === 0)
        return [undefined, []]
    const root = getDataRoot([...nodes][0])

    const interestingNodes = new Set<InternalNode>()
    const queriedNodes = new Set<InternalNode>(nodes)

    for(const node of nodes) {
        for(let cur: InternalNode | undefined = node; cur; cur = cur.parent) {
            interestingNodes.add(cur)
        }
    }

    // Find lowest common ancestor
    // Starting the batch from the lowest possible root improves performance
    let lca: InternalNode = root
    while(!queriedNodes.has(lca) && lca.children.filter(c => interestingNodes.has(c)).length == 1) {
        lca = lca.children.find(c => interestingNodes.has(c))!
    }

    const indexToSrcNode: InternalNode[] = []
    const tree = createPurgeNodeTree(lca, indexToSrcNode, v => prepurgeNodes.has(v) ? undefined : interestingNodes.has(v))
    return [tree, indexToSrcNode.map(d => queriedNodes.has(d) ? d : undefined)]
}

function createPurgeNodeTree(node: InternalNode, indexToSrcNode: InternalNode[], expandCallback: (v: InternalNode) => boolean | undefined): PurgeTreeNode<number> | undefined {
    const root: PurgeTreeNode<number> = { token: indexToSrcNode.length }
    indexToSrcNode.push(node)

    const mids = [...node.cg_nodes]
    const children = []
    for(const child of node.children) {
        const decision = expandCallback(child)
        if (decision === undefined)
            continue;
        if (decision) {
            const child_root = createPurgeNodeTree(child, indexToSrcNode, expandCallback)
            if (child_root)
                children.push(child_root)
        } else {
            mids.push(...collectCgNodesInSubtree(child))
        }
    }

    if (children.length === 0 && mids.length === 0)
        return undefined

    if (mids.length !== 0)
        root.mids = mids

    if (children.length !== 0)
        root.children = children

    return root
}

class BatchPurgeScheduler {
    callback?: (node: InternalNode, data: ReachabilityVector) => void
    private readonly purgedSizeBaseline: number
    private readonly codesizes: number[]
    private readonly cg: Remote<RemoteCausalityGraph>
    private readonly prepurgeNodes: InternalNode[]
    private waitlist: InternalNode[] = []
    private runningBatch: Remote<IncrementalSimulationResult<number>> | undefined
    private runningIndexToNode: (InternalNode | undefined)[] = []

    constructor(cg: Remote<RemoteCausalityGraph>, codesizes: number[], purgedSizeBaseline: number, prepurgeNodes: InternalNode[] = []) {
        this.cg = cg
        this.codesizes = codesizes
        this.purgedSizeBaseline = purgedSizeBaseline
        this.prepurgeNodes = prepurgeNodes
    }

    request(nodes: InternalNode[]) {
        this.waitlist.push(...nodes)
    }

    async next() {
        if(this.runningBatch) {
            const token = await this.runningBatch.simulateNext()
            if(token === undefined) {
                this.runningBatch.delete()
                this.runningBatch = undefined
                return this.waitlist.length > 0
            }

            const node = this.runningIndexToNode[token]
            if(node) {
                if(this.callback) {
                    const stillReachable = await this.runningBatch.getReachableArray()
                    let purgedSize = -this.purgedSizeBaseline
                    for (let i = 0; i < this.codesizes.length; i++)
                        if (stillReachable[i] === 0xFF)
                            purgedSize += this.codesizes[i]
                    this.callback(node, { arr: stillReachable, size: purgedSize })
                }
            }
            return true
        } else if(this.waitlist.length > 0) {
            const [tree, nodesByIndex] = createPurgeNodeTree2(new Set(this.waitlist), new Set(this.prepurgeNodes))
            this.runningIndexToNode = nodesByIndex
            this.runningBatch = await this.cg.simulatePurgesBatched(tree!, [...new Set(this.prepurgeNodes)].flatMap(collectCgNodesInSubtree)) as Remote<IncrementalSimulationResult<number>>
            this.waitlist = []
            return true
        } else {
            return false
        }
    }
}

class PurgeScheduler {
    detailSelectedCallback: ((edges: ReachabilityHyperpathEdge[] | undefined) => void) | undefined

    private _purgeSelectedMids: InternalNode[] = []
    private _detailSelectedMid: number | undefined

    private selectedSimulationResult: DetailedSimulationResult | undefined
    private detailNeedsUpdate = false

    private cg: Remote<RemoteCausalityGraph>
    private codesizes: number[]
    private all_reachable: Uint8Array

    private singleBatchScheduler: BatchPurgeScheduler
    private additionalBatchScheduler?: BatchPurgeScheduler

    private _additionalPurgeCallback?: (node: InternalNode, data: ReachabilityVector) => void

    private processingRunning = false

    constructor(cg: Remote<RemoteCausalityGraph>, codesizes: number[], all_reachable: Uint8Array) {
        this.cg = cg
        this.codesizes = codesizes
        this.all_reachable = all_reachable

        let baseline = 0
        for (let i = 0; i < this.codesizes.length; i++)
            if (all_reachable[i] === 0xFF)
                baseline += this.codesizes[i]
        this.singleBatchScheduler = new BatchPurgeScheduler(cg, codesizes, baseline)
    }

    get detailSelectedMid(): number | undefined {
        return this._detailSelectedMid
    }

    set singlePurgeCallback(callback: (node: InternalNode, data: ReachabilityVector) => void) {
        this.singleBatchScheduler.callback = callback
    }

    set additionalPurgeCallback(callback: (node: InternalNode, data: ReachabilityVector) => void) {
        this._additionalPurgeCallback = callback
        if(this.additionalBatchScheduler)
            this.additionalBatchScheduler.callback = callback
    }

    set purgeSelectedMids(nodes: InternalNode[]) {
        this._purgeSelectedMids = nodes
        if(this._detailSelectedMid) {
            if(this.selectedSimulationResult) {
                this.selectedSimulationResult.delete()
                this.selectedSimulationResult = undefined
            }
            this.detailNeedsUpdate = true
        }
        this.additionalBatchScheduler = undefined
        this.ensureProcessing()
    }

    set detailSelectedMid(mid: number | undefined) {
        this._detailSelectedMid = mid
        if(!mid) {
            if(this.detailSelectedCallback)
                this.detailSelectedCallback(undefined)
        } else {
            this.detailNeedsUpdate = true
            this.ensureProcessing()
        }
    }

    requestSinglePurgeInfo(v: InternalNode[]) {
        this.singleBatchScheduler.request(v)
        this.ensureProcessing()
    }

    async requestAdditionalPurgeInfo(v: InternalNode[]) {
        if(this._purgeSelectedMids.length === 0)
            return
        if(!this.additionalBatchScheduler) {
            const stillReachable = await this.cg.simulatePurge([...new Set(this._purgeSelectedMids.flatMap(collectCgNodesInSubtree))])
            let baseline = 0
            for (let i = 0; i < this.codesizes.length; i++)
                if (stillReachable[i] === 0xFF)
                    baseline += this.codesizes[i]
            this.additionalBatchScheduler = new BatchPurgeScheduler(this.cg, this.codesizes, baseline, this._purgeSelectedMids)
            this.additionalBatchScheduler.callback = this._additionalPurgeCallback
        }
        this.additionalBatchScheduler.request(v)
        this.ensureProcessing()
    }

    private async doProcessing() {
        this.processingRunning = true
        while(true) {
            if(this.detailNeedsUpdate) {
                if(!this.selectedSimulationResult)
                    this.selectedSimulationResult = await this.cg.simulatePurgeDetailed(this._purgeSelectedMids.flatMap(v => [...new Set(collectCgNodesInSubtree(v))]))
                const edges = await this.selectedSimulationResult.getReachabilityHyperpath(this._detailSelectedMid)
                if(this.detailSelectedCallback)
                    this.detailSelectedCallback(edges)
                this.detailNeedsUpdate = false
            }
            else if(await this.singleBatchScheduler.next()) {
            }
            else if(this.additionalBatchScheduler && await this.additionalBatchScheduler.next()) {
            } else {
                break
            }
        }
        this.processingRunning = false
    }

    private ensureProcessing() {
        if(!this.processingRunning)
            this.doProcessing()
    }
}

export class CutTool {
    ps: PurgeScheduler
    cg: Remote<RemoteCausalityGraph>
    codesizes: number[]
    methodList: string[]
    typeList: string[]
    all_reachable: Uint8Array
    dataRoot: InternalNode

    maxCodeSize: number
    detailSelectedNode?: HTMLElement

    precomputeCutoffs = true
    reachable_under_selection?: Uint8Array
    reachable_in_image_view?: Uint8Array // Also has the purges of current hover
    maxPurgedSize = 0
    selectedForPurging: Set<InternalNode> = new Set()


    cutviewData: Map<InternalNode, CutViewData> = new Map<InternalNode, CutViewData>()
    imageviewData : Map<InternalNode, ImageViewData> = new Map<InternalNode, ImageViewData>()

    constructor(universe: CausalityGraphUniverse, cg: any, allReachable: Uint8Array) {
        document.getElementById('main-panel')!.hidden = true
        document.getElementById('loading-panel')!.hidden = false

        const reachabilityData = universe.reachabilityData
        this.methodList = universe.cgNodeLabels
        this.typeList = universe.cgTypeLabels

        const codesizesDict = getMethodCodesizeDictFromReachabilityJson(reachabilityData)
        this.codesizes = new Array(this.methodList.length)

        for(let i = 0; i < this.methodList.length; i++) {
            this.codesizes[i] = codesizesDict[this.methodList[i]] ?? 0
        }

        this.cg = cg
        this.reachable_in_image_view = this.reachable_under_selection = this.all_reachable = allReachable
        this.ps = new PurgeScheduler(cg, this.codesizes, allReachable)
        this.ps.detailSelectedCallback = edges => this.renderGraphOnDetailView(edges)

        this.ps.singlePurgeCallback = (v, data) => {
            const vCutData = this.cutviewData.get(v)
            if(!vCutData)
                return

            vCutData.reachable_after_cutting_this = data
            this.increaseMaxPurgedSize(data.size)
            this.refreshPurgeSizeInCutOverview(vCutData)

            const parent = v.parent
            if(!parent)
                return

            let highestBelowSize = 100000000000
            let highestBelow = null
            for(const c of parent.children) {
                if(c === v)
                    continue
                const cCutData = this.cutviewData.get(c)!
                const comp = cCutData.reachable_after_cutting_this
                if(!comp)
                    continue
                if(comp.size < data.size)
                    continue
                if(comp.size < highestBelowSize) {
                    highestBelow = cCutData.html
                    highestBelowSize = comp.size
                }
            }

            const list = vCutData.html.parentElement!
            list.insertBefore(vCutData.html, highestBelow ? highestBelow.nextSibling : list.children[0])
        }

        this.ps.additionalPurgeCallback = (u, data) => {
            const uCutData = this.cutviewData.get(u)
            if(uCutData) {
                uCutData.reachable_after_additionally_cutting_this = data
                this.refreshPurgeSizeInCutOverview(uCutData)
            }
        }

        this.dataRoot = generateHierarchyFromReachabilityJsonAndMethodList(reachabilityData, this.methodList)

        document.getElementById('loading-panel')!.hidden = true
        document.getElementById('main-panel')!.hidden = false

        this.maxCodeSize = Math.max(...this.dataRoot.children.map(d => d.size))

        {
            const rootTreeViewElement = document.getElementById('imageview-root')!
            const list = this.generateHtmlImageview(this.dataRoot)
            rootTreeViewElement.appendChild(list)
            list.classList.remove('nested')
            list.classList.add('unpadded')
            list.classList.add('active')
        }
        {
            const rootTreeViewElement = document.getElementById('cut-overview-root')!
            const list = this.generateHtmlCutview(this.dataRoot)
            rootTreeViewElement.appendChild(list)
            list.classList.remove('nested')
            list.classList.add('unpadded')
            list.classList.add('active')
        }

        let mainMethod: InternalNode | undefined
        forEachInSubtree(this.dataRoot, v => {
            if(v.main)
                mainMethod = v
        })

        if(mainMethod) {

            const pathToMainMethod: InternalNode[] = []
            for(let cur: InternalNode = mainMethod; cur.parent; cur = cur.parent) {
                pathToMainMethod.unshift(cur)
            }

            pathToMainMethod.pop()

            for(let i = 0; i < pathToMainMethod.length; i++) {
                const list = this.generateHtmlCutview(pathToMainMethod[i])
                this.cutviewData.get(pathToMainMethod[i])!.html.appendChild(list)
                list.classList.add('active')
                list.parentElement!.querySelector('.caret')!.classList.add('caret-down')
            }
        }

        this.ps.requestSinglePurgeInfo([...this.cutviewData.keys()])
    }

    public static async create(universe: CausalityGraphUniverse) {
        const cg = await universe.getCausalityGraph()
        const allReachable = await cg.simulatePurge()
        return new CutTool(universe, cg, allReachable)
    }

    public dispose() {
        document.getElementById('imageview-root')!.textContent = ''
        document.getElementById('cut-overview-root')!.textContent = ''
        document.getElementById('main-panel')!.hidden = true
    }

    public changePrecomputeCutoffs(enable: boolean) {
        this.precomputeCutoffs = enable
    }









    private generateHtmlCutview(data: InternalNode) {
        const ul = document.createElement('ul')
        ul.className = 'nested'

        for(const d of data.children) {
            const li = document.createElement('li')
            const cutData: CutViewData = { html: li, reachable_after_additionally_cutting_this: undefined, reachable_after_cutting_this: undefined }
            this.cutviewData.set(d, cutData)
            li.className = 'cut-row'
            ul.appendChild(li)

            const cutSizeColumn = document.createElement('span')
            cutSizeColumn.className = 'cut-size-column'
            li.appendChild(cutSizeColumn)

            const cutSizeBar = document.createElement('div')
            cutSizeBar.className = 'cut-size-bar'
            li.appendChild(cutSizeBar)

            const node = d
            const span = document.createElement('span')
            span.className = 'caret'
            if (d.children.length) {
                span.addEventListener('click', () => {
                    expandClickHandler(span, node, () => {
                        const list = this.generateHtmlCutview(node)
                        li.appendChild(list)
                        return this.recalculateCutOverviewForSubtree(node)
                    });
                });
            } else {
                span.style.visibility = 'hidden'
            }
            li.appendChild(span)

            const nameSpan = document.createElement('span')
            nameSpan.appendChild(document.createTextNode(d.name ?? ''))
            // nameSpan.title = d.fullname
            nameSpan.classList.add('node-text', 'selectable')

            if(node.cg_only)
                nameSpan.classList.add('cg-only')

            li.appendChild(nameSpan)

            nameSpan.addEventListener('mouseenter', async () => {
                if(this.selectedForPurging.has(node))
                    return;

                const maybe_reachable_in_image_view = this.selectedForPurging.size === 0 ? cutData.reachable_after_cutting_this : cutData.reachable_after_additionally_cutting_this
                if (maybe_reachable_in_image_view) {
                    this.reachable_in_image_view = maybe_reachable_in_image_view.arr
                    this.updatePurgeValues()
                    nameSpan.classList.add('hovered-for-purge')
                }
            })

            nameSpan.addEventListener('mouseleave', async () => {
                nameSpan.classList.remove('hovered-for-purge')

                if(this.selectedForPurging.has(node))
                    return;

                if(this.reachable_in_image_view !== this.reachable_under_selection) {
                    this.reachable_in_image_view = this.reachable_under_selection
                    this.updatePurgeValues()
                }
            })

            nameSpan.addEventListener('click', async () => {
                nameSpan.classList.remove('hovered-for-purge')
                const selected = nameSpan.classList.toggle('selected-for-purge')
                if (selected) {
                    this.selectedForPurging.add(node)
                } else {
                    this.selectedForPurging.delete(node)
                }

                this.ps.purgeSelectedMids = [...this.selectedForPurging]


                if (selected && cutData.reachable_after_additionally_cutting_this) {
                    this.reachable_in_image_view = this.reachable_under_selection = cutData.reachable_after_additionally_cutting_this.arr
                } else {
                    const purgeSet = [...new Set([...this.selectedForPurging].flatMap(collectCgNodesInSubtree))]
                    this.reachable_in_image_view = this.reachable_under_selection = await this.cg.simulatePurge(purgeSet)
                }

                this.updatePurgeValues()

                document.body.classList.add('waiting')

                if(this.precomputeCutoffs && this.selectedForPurging.size > 0) {
                    await this.precomputeCutOverview()
                } else {
                    forEachInSubtree(this.dataRoot, u => {
                        const uCutData = this.cutviewData.get(u)
                        if(uCutData) {
                            uCutData.reachable_after_additionally_cutting_this = undefined
                            this.refreshPurgeSizeInCutOverview(uCutData)
                        }
                    })
                }

                document.body.classList.remove('waiting')
            })
        }

        return ul
    }

    private generateHtmlImageview(data: InternalNode) {
        const ul = document.createElement('ul')
        ul.className = 'nested'

        const imageViewDataEntry = this.imageviewData.get(data)
        if (imageViewDataEntry)
            delete imageViewDataEntry.exclusive_transitive_cg_nodes

        for(const d of data.children) {
            if(d.cg_only)
                continue

            const li = document.createElement('li')
            const viewData: ImageViewData = { exclusive_transitive_cg_nodes: collectCgNodesInSubtree(d), html: li }
            this.imageviewData.set(d, viewData)
            li.className = 'image-row'
            ul.appendChild(li)
            const span = document.createElement('span')
            li.appendChild(span)

            {
                const totalSizeColumn = document.createElement('span')
                totalSizeColumn.className = 'total-size-column'
                totalSizeColumn.textContent = formatByteSizesWithUnitPrefix(d.size)
                li.appendChild(totalSizeColumn)
            }

            {
                const sizeBarOuter = document.createElement('div')
                sizeBarOuter.className = 'size-bar-outer'
                sizeBarOuter.style.width = (d.size / this.maxCodeSize * 100) + '%'
                li.appendChild(sizeBarOuter)

                const sizeBarInner = document.createElement('div')
                sizeBarInner.className = 'size-bar-inner'
                sizeBarOuter.appendChild(sizeBarInner)
            }

            {
                const purgePercentageBarOuter = document.createElement('div')
                purgePercentageBarOuter.className = 'purge-percentage-bar-outer'
                li.appendChild(purgePercentageBarOuter)

                const purgePercentageBarInner = document.createElement('div')
                purgePercentageBarInner.className = 'purge-percentage-bar-inner'
                purgePercentageBarOuter.appendChild(purgePercentageBarInner)

                const purgePercentageBarText = document.createElement('span')
                purgePercentageBarText.className = 'purge-percentage-bar-text'
                purgePercentageBarOuter.appendChild(purgePercentageBarText)
            }

            const node = d
            span.className = 'caret'
            if (d.children && d.children.some(c => !c.cg_only)) {
                span.addEventListener('click', () => {
                    expandClickHandler(span, node, () => {
                        li.appendChild(this.generateHtmlImageview(node))
                        node.children.forEach(u => this.refreshPurgeValueForImageviewNode(u))
                    });
                });
            } else {
                span.style.visibility = 'hidden'
            }
            li.appendChild(span)

            const nameSpan = document.createElement('span')
            nameSpan.appendChild(document.createTextNode(d.name))
            // nameSpan.title = d.fullname
            nameSpan.className = 'node-text'
            li.appendChild(nameSpan)

            const mid = node.exact_cg_node

            if (mid !== undefined) {
                nameSpan.classList.add('selectable')
                nameSpan.addEventListener('click', async () => {
                    if (this.ps.detailSelectedMid === mid) {
                        nameSpan.classList.remove('selected-for-detail')
                        this.ps.detailSelectedMid = undefined
                        this.detailSelectedNode = undefined
                    } else {
                        if(this.detailSelectedNode) {
                            this.detailSelectedNode.querySelector<HTMLSpanElement>('.node-text')!.classList.remove('selected-for-detail')
                        }
                        nameSpan.classList.add('selected-for-detail')
                        this.ps.detailSelectedMid = mid
                        this.detailSelectedNode = this.imageviewData.get(node).html
                    }
                })
            }
        }

        const child_sizes = data.children.filter(d => !d.cg_only).map(cn => cn.size)

        const order = new Array(child_sizes.length)
        for(let i = 0; i < order.length; i++)
            order[i] = i

        const nodes = ul.children
        order.sort((a, b) => child_sizes[b] - child_sizes[a]).map(i => nodes[i]).forEach(node => ul.appendChild(node))

        return ul
    }

    private precomputeCutOverview() {
        for(const cCutData of this.cutviewData.values()) {
            cCutData.reachable_after_additionally_cutting_this = undefined
            this.refreshPurgeSizeInCutOverview(cCutData)
        }
        this.ps.requestAdditionalPurgeInfo(Array.from(this.cutviewData.keys()))
    }

    private refreshPurgeSizeInCutOverview(cutData: CutViewData) {
        const html = cutData.html

        assert(this.maxPurgedSize)

        const purged = this.selectedForPurging.size > 0 && this.precomputeCutoffs ? cutData.reachable_after_additionally_cutting_this : cutData.reachable_after_cutting_this

        let text = null
        let width = '0'
        if(purged) {
            text = formatByteSizesWithUnitPrefix(purged.size)
            width = (purged.size / this.maxPurgedSize * 100) + '%'
        }
        html.querySelector<HTMLSpanElement>('.cut-size-column')!.textContent = text
        html.querySelector<HTMLDivElement>('.cut-size-bar')!.style.width = width
    }

    private increaseMaxPurgedSize(size: number) {
        if(this.maxPurgedSize && size <= this.maxPurgedSize)
            return
        this.maxPurgedSize = size

        for(const [, v] of this.cutviewData.entries()) {
            this.refreshPurgeSizeInCutOverview(v)
        }
    }

    private async recalculateCutOverviewForSubtree(node: InternalNode) {
        this.ps.requestSinglePurgeInfo(node.children)

        if (this.precomputeCutoffs && this.selectedForPurging.size > 0) {
            let containedInSelection = false
            for (const u of [...this.selectedForPurging]) {
                forEachInSubtree(u, v => {
                    if(v === node)
                        containedInSelection = true
                })
            }

            if(containedInSelection) {
                for (const u of node.children) {
                    const uCutData = this.cutviewData.get(u)
                    if(uCutData)
                        uCutData.reachable_after_additionally_cutting_this = undefined
                }
            } else {
                this.ps.requestAdditionalPurgeInfo(node.children)
            }
        }
    }

    private updatePurgeValues() {
        forEachInStrictSubtreePostorder(this.dataRoot, u => this.imageviewData.get(u) !== undefined, u => this.refreshPurgeValueForImageviewNode(u))
    }

    private refreshPurgeValueForImageviewNode(u: InternalNode) {
        const still_reachable = this.reachable_in_image_view ?? this.all_reachable

        const uImageviewData = this.imageviewData.get(u)
        assert(uImageviewData)
        if(!uImageviewData)
            return

        let purgedCodesize = 0
        if(uImageviewData.exclusive_transitive_cg_nodes) {
            for (const i of uImageviewData.exclusive_transitive_cg_nodes)
                if (this.all_reachable[i] !== 0xFF && still_reachable[i] === 0xFF)
                    purgedCodesize += this.codesizes[i]
        } else {
            for (const i of u.cg_nodes)
                if (this.all_reachable[i] !== 0xFF && still_reachable[i] === 0xFF)
                    purgedCodesize += this.codesizes[i]
            for (const v of u.children) {
                const vImageviewData = this.imageviewData.get(v)
                if(vImageviewData)
                    purgedCodesize += vImageviewData.purgedCodesize
            }
        }

        uImageviewData.purgedCodesize = purgedCodesize
        const html = uImageviewData.html

        const purgedPercentage = 100 * purgedCodesize / u.size
        let barWidth = '0'
        let percentageText = ''
        if (u.size !== 0) {
            barWidth = purgedPercentage.toFixed(1) + '%'
            percentageText = purgedPercentage === 0 ? '' : purgedPercentage.toFixed(1) + ' %'
        }
        html.querySelector<HTMLSpanElement>('.purge-percentage-bar-text')!.textContent = percentageText
        html.querySelector<HTMLDivElement>('.purge-percentage-bar-inner')!.style.width = barWidth
        html.querySelector<HTMLDivElement>('.size-bar-inner')!.style.width = barWidth
    }

    private renderGraphOnDetailView(edges: { src: number, dst: number, via_type?: number }[] | undefined) {
        const htmlSvg = document.getElementById('chart')!
        htmlSvg.textContent = ''

        const nothingSelected = !edges
        document.querySelector<HTMLDivElement>('.detail-div')!.hidden = nothingSelected
        if(nothingSelected)
            return

        if(edges.length === 0)
            return

        // Graph construction
        const nodesSet: Set<number> = new Set()
        const links: VisGraphLink[] = []

        edges.forEach(e => {
            if(e.src === -1 || e.dst === -1)
                return

            nodesSet.add(e.src);
            nodesSet.add(e.dst);
            const newObj: { source: number, target: number, via_type?: number } = { source: e.src, target: e.dst }
            if (e.via_type)
                newObj.via_type = e.via_type
            links.push(newObj);
        });

        const nodeIds = [...nodesSet]

        // Modeling adjacency through indices
        links.forEach((d, i) => {
            links[i].source = nodeIds.indexOf(links[i].source);
            links[i].target = nodeIds.indexOf(links[i].target);
        });

        const nodes: VisGraphNode[] = nodeIds.map((d, i) => { return { index: i, mid: d, name: this.methodList[d] ?? '<root>', adj: [], in_deg: 0, depth: 0 }})

        links.forEach(l => {
            nodes[l.source].adj.push(l)
            nodes[l.target].in_deg += 1
        })

        let order = []

        for(let v = 0; v < nodes.length; v++)
            if(nodes[v].in_deg === 0)
                order.push(v)
        for(let i = 0; i < order.length; i++)
            for(const e of nodes[order[i]].adj) {
                const v = e.target
                nodes[v].in_deg -= 1
                if(nodes[v].in_deg === 0)
                    order.push(v)
            }

        order = order.reverse()

        let maxDepth = 0

        for(const u of order) {
            let depth = 0
            for(const e of nodes[u].adj) {
                const v = e.target
                if(nodes[v].depth + 1 > depth)
                    depth = nodes[v].depth + 1
            }
            nodes[u].depth = depth
            if(depth > maxDepth)
                maxDepth = depth
        }

        function applyLayering<TNode extends { data: VisGraphNode, value?: number, dataChildren: { child: TNode | undefined }[] }>(n: undefined | TNode) {
            if(!n)
                return
            n.value = n.data.depth
            if(n.dataChildren)
                for(const c of n.dataChildren) {
                    applyLayering(c.child)
                }
        }

        const dag: d3dag.Dag<VisGraphNode, VisGraphLink> = d3dag.dagStratify()
            .id((arg: {index: number}) => arg.index.toString())
            .parentData((arg: VisGraphNode) => arg.adj.map(e => [e.target.toString(), e]))
            (nodes);
        const nodeRadius = 20;
        const layout = d3dag
            .sugiyama() // base layout
            // .layering(applyLayering)
            .decross(d3dag.decrossTwoLayer()) // minimize number of crossings
            .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]); // set node size instead of constraining to fit
        const { width, height } = layout(dag);
        const x0 = 0;
        const x1 = width;
        const y0 = 0;
        const y1 = height;

        // --------------------------------
        // This code only handles rendering
        // --------------------------------
        const outerSvg = d3.select('#detail-svg')
        outerSvg.attr('viewBox', [0, 0, width, height].join(' '));
        const svgSelection = d3.select('#chart');

        // How to draw edges
        const line = d3
            .line()
            .curve(d3.curveCatmullRom)
            .x(d => d[0])
            .y(d => d[1]);

        // Plot edges
        const linksSelection = svgSelection
            .append('g')
            .selectAll('path')
            .data(dag.links())
            .enter()
            .append('path')
            .attr('d', ({ points }) => line(points.map(({ x, y }) => [x, y])))
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('class', ({data}) => {
                if(data.via_type !== undefined) {
                    return 'support-edge'
                } else {
                    return 'direct-edge'
                }
            })

        linksSelection
            .append('title')
            .text(({data}) => data.via_type !== undefined ? this.typeList[data.via_type] : '')

        // Select nodes
        const nodesSelection = svgSelection
            .append('g')
            .selectAll('g')
            .data(dag.descendants())
            .enter()
            .append('g')
            .attr('transform', ({ x, y }) => `translate(${x}, ${y})`);

        // Plot node circles
        const nodeCircles = nodesSelection
            .append('circle')

        nodeCircles
            .attr('r', nodeRadius)
            .attr('fill', d => getColorAccordingToCausalityGraphNodeType(d.data.name))

        nodesSelection
            .append('title')
            .text(d => d.data.name)

        const textSize = 20

        // Add text to nodes
        const nodeLabels = nodesSelection
            .append('text')

        nodeLabels
            .text((d) => getUnqualifiedCausalityGraphNodeName(d.data.name))
            .attr('font-family', 'sans-serif')
            .attr('text-anchor', 'left')
            .attr('fill', 'black')
            .attr('dominant-baseline', 'middle')
            .attr('x', nodeRadius * 1.2)
            .attr('font-size', textSize)


        function onZoom() {
            const transform = d3.zoomTransform(d3.select<Element, unknown>('#chartpanel').node()!);

            function transX(num: number)
            {
                return num * transform.k + transform.x
            }

            function transY(num: number)
            {
                return num * transform.k + transform.y;
            }

            nodesSelection
                .attr('transform', ({x, y}) => `translate(${transX(x)}, ${transY(y)})`)
            nodeCircles
                .attr('r', transform.k * nodeRadius)

            linksSelection.attr('d', ({ points }) => line(points.map(({x, y}) => {return [transX(x), transY(y)]})))
                .attr('stroke-width', transform.k * 3)

            nodeLabels
                .attr('font-size', transform.k * textSize)
                .attr('x', transform.k * nodeRadius * 1.2)
        }

        const zoom = d3.zoom().on('zoom', onZoom);
        d3.select<Element, unknown>('#chartpanel').call(zoom.transform, d3.zoomIdentity)
        d3.select<Element, unknown>('#chartpanel').call(zoom);
    }

}

interface VisGraphNode
{
    index: number
    name: string
    adj: VisGraphLink[]
    in_deg: number
    mid: number,
    depth: number
}

interface VisGraphLink
{
    source: number
    target: number
    via_type?: number
}