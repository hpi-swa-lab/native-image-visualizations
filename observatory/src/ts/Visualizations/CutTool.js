import * as d3 from 'd3'
import * as d3dag from 'd3-dag'
import {CausalityGraph, DetailedSimulationResult} from './CG/CausalityGraph';

function assert(cond) {
    if(!cond)
        throw new Error('Assertion failed!')
}

let codesizes
let methodList
let typeList
let all_reachable_res
let all_reachable
let dataRoot

let selectedSimulationResult

function getMethodCodesizeDictFromReachabilityJson(data) {
    const dict = {}

    for (const toplevel of data) {
        for (const packageName in toplevel.packages) {
            const pkg = toplevel.packages[packageName]
            for (const typeName in pkg.types) {
                const type = pkg.types[typeName]
                for (const methodName in type.methods) {
                    const method = type.methods[methodName]
                    const fullyQualifiedName = `${packageName}.${typeName}.${methodName}`
                    dict[fullyQualifiedName] = method.size
                }
            }
        }
    }

    return dict
}

let precomputeCutoffs = true

export function changePrecomputeCutoffs(enable) {
    precomputeCutoffs = enable
}

class Trie {
    root = { next: {} }

    constructor(dict) {
        for (const str in dict)
            this.add(str, dict[str])
    }

    add(key, value) {
        let node = this.root
        for (const c of key) {
            if (!node.next[c]) {
                node.next[c] = { next: {} }
            }
            node = node.next[c]
        }
        node.val = value
    }

    find(str) {
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

const selectedForPurging = new Set()

function generateHierarchyFromReachabilityJsonAndMethodList(json, cgNodes) {
    const dict = { children: [] }

    const prefixToNode = {}

    for (const toplevel of json) {
        let l1name = 'ϵ'
        let l1fullname = ''

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
        } else if(toplevel.path) {
            l1name = display_path
            l1fullname = toplevel.path
        } else if(toplevel.module) {
            l1name = toplevel.module
            l1fullname = toplevel.module
        }

        const l1 = { children: [], name: l1name, fullname: l1fullname, cg_nodes: [] }
        if (toplevel.path) {
            prefixToNode[toplevel.path] = l1
        }
        dict.children.push(l1)

        for (const packageName in toplevel.packages) {
            const pkg = toplevel.packages[packageName]
            let prefix = ''
            let l2 = l1

            if(packageName.length !== 0) {
                for (const subPackageName of packageName.split('.')) {
                    prefix += subPackageName + '.'
                    let next = l2.children.find(n => n.name === subPackageName)
                    if(!next) {
                        next = { children: [], fullname: prefix, name: subPackageName, cg_nodes: [] }

                        /* Eigentlich sollten keine Causality-Graph-Knoten direkt in einem Package hängen.
                         * Es gibt jedoch Knoten für Klassen, die nicht reachable sind (z.B. Build-Time-Features).
                         * Diese müssen unbedingt in die Abschneide-Berechnung miteinbezogen werden.
                         * Idealerweise sollten sie auch in der Baumstruktur auftauchen.
                         * Das ist aber gerade noch zu kompliziert umzusetzen... */
                        prefixToNode[prefix] = next

                        l2.children.push(next)
                    }
                    l2 = next
                }
            }

            for (const typeName in pkg.types) {
                const type = pkg.types[typeName]
                const l3 = { fullname: prefix + typeName, name: typeName, cg_nodes: [] }
                prefixToNode[l3.fullname] = l3
                l2.children.push(l3)

                if (Object.keys(type.methods).length > 0)
                    l3.children = []

                for (const method in type.methods) {
                    const l4 = { fullname: l3.fullname + '.' + method, name: method, cg_nodes: [] }
                    prefixToNode[l4.fullname] = l4
                    l3.children.push(l4)
                }
            }
        }
    }

    const trie = new Trie(prefixToNode)

    for (let i = 0; i < cgNodes.length; i++) {
        const cgNodeName = cgNodes[i]
        const node = trie.find(cgNodeName)
        if (node) {
            if (node.fullname === cgNodeName) {
                node.cg_nodes.push(i)
            } else {
                let curNode = node
                let offset = node.fullname.length
                let name = cgNodeName.substring(offset).trimStart()
                if (name.startsWith('.')) {
                    offset++
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

                    const newNode = { cg_only: true, fullname: cgNodeName.substring(0, offset + dotIndex), name: name.substring(0, dotIndex), cg_nodes: [] }
                    if(!curNode.children)
                        curNode.children = []
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

                const newNode = { cg_only: true, fullname: cgNodeName, name: name, cg_nodes: [i] }
                if(!curNode.children)
                    curNode.children = []
                curNode.children.push(newNode)
                trie.add(newNode.fullname, newNode)
            }
        }
    }

    return dict
}

function formatByteSizesWithUnitPrefix(size) {
    if(size > 1000000)
        return (size / 1000000).toPrecision(3) + ' MB'
    else if(size > 1000)
        return (size / 1000).toPrecision(3) + ' KB'
    else
        return size.toPrecision(3) + ' B'
}

function forEachInSubtree(node, callback) {
    let stack = []
    stack.push(node)
    while (stack.length > 0) {
        const u = stack.pop()
        if (u.children)
            stack = stack.concat(u.children)
        callback(u)
    }
}

function collectCgNodesInSubtree(node) {
    let group = []
    forEachInSubtree(node, u => {
        if (u.cg_nodes)
            group = group.concat(u.cg_nodes)
    })
    return group
}

function insertChildren(element, node) {
    const list = generateHtmlCutview(node)
    element.appendChild(list)
    recalculateCutOverviewForSubtree(list, node)
}

function expandClickHandler(element, node, populateCallback) {
    const expanded = element.classList.toggle('caret-down');

    if(!element.parentElement.querySelector('.nested') && expanded) {
        populateCallback()
    }

    element.parentElement.querySelector('.nested').classList.toggle('active');
}

function generateHtmlCutview(data) {
    const ul = document.createElement('ul')
    ul.className = 'nested'

    for(const d of data.children) {
        const li = document.createElement('li')
        li.className = 'cut-row'
        d.html = li
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
        if (d.children) {
            span.addEventListener('click', () => {
                expandClickHandler(span, node, () => insertChildren(li, node));
            });
        } else {
            span.style.visibility = 'hidden'
        }
        li.appendChild(span)

        const nameSpan = document.createElement('span')
        nameSpan.appendChild(document.createTextNode(d.name))
        // nameSpan.title = d.fullname
        nameSpan.classList.add('node-text', 'selectable')

        if(node.cg_only)
            nameSpan.classList.add('cg-only')

        li.appendChild(nameSpan)

        nameSpan.addEventListener('mouseenter', async () => {
            if(selectedForPurging.has(node))
                return;

            const maybe_reachable_in_image_view = selectedForPurging.size === 0 ? node.reachable_after_cutting_this : node.reachable_after_additionally_cutting_this
            if (maybe_reachable_in_image_view) {
                reachable_in_image_view = maybe_reachable_in_image_view.arr
                updatePurgeValues()
                nameSpan.classList.add('hovered-for-purge')
            }
        })

        nameSpan.addEventListener('mouseleave', async () => {
            nameSpan.classList.remove('hovered-for-purge')

            if(selectedForPurging.has(node))
                return;

            if(reachable_in_image_view !== reachable_under_selection) {
                reachable_in_image_view = reachable_under_selection
                updatePurgeValues()
            }
        })

        nameSpan.addEventListener('click', async () => {
            nameSpan.classList.remove('hovered-for-purge')
            const selected = nameSpan.classList.toggle('selected-for-purge')
            if (selected) {
                selectedForPurging.add(node)
            } else {
                selectedForPurging.delete(node)
            }

            if(selectedSimulationResult) {
                selectedSimulationResult.delete()
                selectedSimulationResult = undefined
            }

            if (selected && node.reachable_after_additionally_cutting_this) {
                reachable_in_image_view = reachable_under_selection = node.reachable_after_additionally_cutting_this.arr
            } else {
                const purgeSet = [...new Set([...selectedForPurging].flatMap(collectCgNodesInSubtree))]
                selectedSimulationResult = detailMid ? cg.simulatePurgeDetailed(purgeSet) : cg.simulatePurge(purgeSet)
                reachable_in_image_view = reachable_under_selection = selectedSimulationResult.reachableView()
            }

            updatePurgeValues()

            document.body.classList.add('waiting')

            await new Promise(resolve => setTimeout(resolve, 1))

            if (detailMid) {
                if(!(selectedSimulationResult instanceof DetailedSimulationResult)) {
                    selectedSimulationResult = cg.simulatePurgeDetailed([...new Set([...selectedForPurging].flatMap(collectCgNodesInSubtree))])
                }
                const edges = selectedSimulationResult.getReachabilityHyperpath(detailMid)
                try {
                    renderGraphOnDetailView(edges, detailMid)
                } catch {
                    // Ignore
                }
            } else {
                renderGraphOnDetailView(undefined, undefined)
            }

            await new Promise(resolve => setTimeout(resolve, 0))

            if(precomputeCutoffs && selectedForPurging.size > 0) {
                precomputeCutOverview()
            } else {
                forEachInSubtree(dataRoot, u => {
                    delete u.reachable_after_additionally_cutting_this
                })
            }

            forEachInSubtree(dataRoot, refreshPurgeSizeInCutOverview)

            document.body.classList.remove('waiting')
        })
    }

    return ul
}

let maxCodeSize
let detailMid
let detailSelectedNode

function generateHtmlImageview(data) {
    const ul = document.createElement('ul')
    ul.className = 'nested'

    for (const d of data.children) {
        let codesize = 0
        forEachInSubtree(d, (v) => {
            if (v.cg_nodes)
                for (const i of v.cg_nodes)
                    codesize += codesizes[i]
        })
        d.size = codesize
    }

    if (data === dataRoot) {
        maxCodeSize = Math.max(...data.children.map(d => d.size))
    }

    assert(maxCodeSize)

    for(const d of data.children) {
        if(d.cg_only)
            continue

        const li = document.createElement('li')
        li.className = 'image-row'
        d.html_imageview = li
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
            sizeBarOuter.style.width = (d.size / maxCodeSize * 100) + '%'
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
                    li.appendChild(generateHtmlImageview(node))
                    node.children.forEach(refreshPurgeValueForImageviewNode)
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

        const mid = node.cg_nodes[0]

        if (mid) {
            nameSpan.classList.add('selectable')
            nameSpan.addEventListener('click', async () => {
                if (detailMid === mid) {
                    nameSpan.classList.remove('selected-for-detail')
                    detailMid = undefined
                    detailSelectedNode = undefined
                } else {
                    if(detailSelectedNode && detailSelectedNode.html_imageview) {
                        detailSelectedNode.html_imageview.querySelector('.node-text').classList.remove('selected-for-detail')
                    }
                    nameSpan.classList.add('selected-for-detail')
                    detailMid = mid
                    detailSelectedNode = node
                }

                let edges = undefined
                if(detailMid) {
                    const detailedRes = cg.simulatePurgeDetailed([...new Set([...selectedForPurging].flatMap(collectCgNodesInSubtree))])
                    edges = detailedRes.getReachabilityHyperpath(detailMid)
                    detailedRes.delete()
                }
                renderGraphOnDetailView(edges, detailMid)
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

function prepareListView(data) {
    {
        const rootTreeViewElement = document.getElementById('cut-overview-root')
        insertChildren(rootTreeViewElement, data)
        const list = rootTreeViewElement.querySelector('ul')
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
    }
    {
        const rootTreeViewElement = document.getElementById('imageview-root')
        const list = generateHtmlImageview(data)
        rootTreeViewElement.appendChild(list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
    }
}

let reachable_under_selection
let reachable_in_image_view // Also has the purges of current hover

function createPurgeNodeTree(node) {
    const root = { src: node }

    let mids = []
    if (node.cg_nodes)
        mids = node.cg_nodes

    const children = []
    if (node.children) {
        for(const child of node.children) {
            if (selectedForPurging.has(child))
                continue;
            if (child.html) {
                const child_root = createPurgeNodeTree(child)
                if (child_root)
                    children.push(child_root)
            } else {
                mids = mids.concat(collectCgNodesInSubtree(child))
            }
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

let maxPurgedSize

function recalculateCutOverviewCustom(purgeNodeTreeRoot, additionalPurges, comparison_array, callback) {
    cg.simulatePurgesBatched(purgeNodeTreeRoot, (node, still_reachable) => {
        let purgedSize = 0
        for (let i = 0; i < codesizes.length; i++)
            if (comparison_array[i] !== 0xFF && still_reachable[i] === 0xFF)
                purgedSize += codesizes[i]
        if (node.src)
            callback(node.src, { arr: still_reachable.slice(), size: purgedSize })
    }, additionalPurges)
}

function recalculateCutOverviewWithSelection(purgeNodeTreeRoot, callback) {
    recalculateCutOverviewCustom(purgeNodeTreeRoot, [...new Set([...selectedForPurging].flatMap(collectCgNodesInSubtree))], reachable_under_selection, callback)
}

function recalculateCutOverviewWithoutSelection(purgeNodeTreeRoot, callback) {
    recalculateCutOverviewCustom(purgeNodeTreeRoot, [], all_reachable, callback)
}

function precomputeCutOverview() {
    for (const node of [...selectedForPurging]) {
        forEachInSubtree(node, u => {
            delete u.reachable_after_additionally_cutting_this
        })
    }

    const purgeNodeTreeRoot = createPurgeNodeTree(dataRoot)

    recalculateCutOverviewWithSelection(purgeNodeTreeRoot, (node, data) => {
        node.reachable_after_additionally_cutting_this = data
    })
}

function refreshPurgeSizeInCutOverview(node) {
    const html = node.html
    if(!html)
        return

    assert(maxPurgedSize)

    const purged = selectedForPurging.size > 0 && precomputeCutoffs ? node.reachable_after_additionally_cutting_this : node.reachable_after_cutting_this

    let text = undefined
    let width = 0
    if(purged) {
        text = formatByteSizesWithUnitPrefix(purged.size)
        width = (purged.size / maxPurgedSize * 100) + '%'
    }
    html.querySelector('.cut-size-column').textContent = text
    html.querySelector('.cut-size-bar').style.width = width
}

function recalculateCutOverviewForSubtree(list, node) {
    // The C++ code doesn't handle empty groups well. Therefore we already handle them here.
    const purgeNodeTreeRoot = { children: node.children.map((c, i) => { return { mids: collectCgNodesInSubtree(c), index: i, src: c } }).filter(n => n.mids.length > 0) }

    maxPurgedSize = 0
    recalculateCutOverviewWithoutSelection(purgeNodeTreeRoot, (node, data) => {
        node.reachable_after_cutting_this = data
        maxPurgedSize = Math.max(maxPurgedSize, data.size)
    })

    if (node === dataRoot)
        maxPurgedSize = maxPurgedSize

    assert(maxPurgedSize)

    function sortKey(a) {
        if(a.reachable_after_cutting_this)
            return a.reachable_after_cutting_this.size
        else
            return -1
    }

    node.children.sort((a, b) => sortKey(b) - sortKey(a)).map(n => n.html).forEach(node => list.appendChild(node))

    if (precomputeCutoffs && selectedForPurging.size > 0) {
        let containedInSelection = false
        for (const u of [...selectedForPurging]) {
            forEachInSubtree(u, v => {
                if(v === node)
                    containedInSelection = true
            })
        }

        if(containedInSelection) {
            for (const u of node.children) {
                delete u.reachable_after_additionally_cutting_this
            }
        } else {
            recalculateCutOverviewWithSelection(purgeNodeTreeRoot, (node, data) => {
                node.reachable_after_additionally_cutting_this = data
            })
        }
    }

    for (const c of node.children) {
        refreshPurgeSizeInCutOverview(c)
    }
}

function updatePurgeValues() {
    forEachInSubtree(dataRoot, refreshPurgeValueForImageviewNode)
}

function refreshPurgeValueForImageviewNode(u) {
    if(!u.html_imageview)
        return

    const still_reachable = reachable_in_image_view ?? all_reachable

    let purgedCodesize = 0
    forEachInSubtree(u, (v) => {
        if (v.cg_nodes)
            for (const i of v.cg_nodes)
                if (all_reachable[i] !== 0xFF && still_reachable[i] === 0xFF)
                    purgedCodesize += codesizes[i]
    })
    const purgedPercentage = 100 * purgedCodesize / u.size
    let barWidth = 0
    let percentageText = ''
    if (u.size !== 0) {
        barWidth = purgedPercentage.toFixed(1) + '%'
        percentageText = purgedPercentage === 0 ? '' : purgedPercentage.toFixed(1) + ' %'
    }
    u.html_imageview.querySelector('.purge-percentage-bar-text').textContent = percentageText
    u.html_imageview.querySelector('.purge-percentage-bar-inner').style.width = barWidth
    u.html_imageview.querySelector('.size-bar-inner').style.width = barWidth
}

function getUnqualifiedCausalityGraphNodeName(fullyQualifiedName) {
    return fullyQualifiedName.replaceAll(/(?<![A-Za-z0-9])([a-z]\w+\.)+/g, '')
}

function getColorAccordingToCausalityGraphNodeType(fullyQualifiedName) {
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

function renderGraphOnDetailView(edges, targetMid) {
    const htmlSvg = document.getElementById('chart')
    htmlSvg.textContent = ''

    const nothingSelected = !edges
    document.querySelector('.detail-div').hidden = nothingSelected
    if(nothingSelected)
        return

    if(edges.length === 0)
        return

    // Graph construction
    const graph = {nodes: new Set(), links: []};

    edges.forEach(function (e) {
        if(e.src === -1 || e.dst === -1)
            return

        graph.nodes.add(e.src);
        graph.nodes.add(e.dst);
        const newObj = { source: e.src, target: e.dst }
        if (e.via_type)
            newObj.via_type = e.via_type
        graph.links.push(newObj);
    });

    graph.nodes = [...graph.nodes]

    // Modeling adjacency through indices
    graph.links.forEach(function (d, i) {
        graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
        graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
    });

    // Store index at each node
    graph.nodes.forEach(function (d, i) {
        graph.nodes[i] = { index: i, mid: d, name: methodList[d] ?? '<root>', adj: [], in_deg: 0 };
    });

    graph.links.forEach(l => {
        graph.nodes[l.source].adj.push(l)
        graph.nodes[l.target].in_deg++
    })

    let order = []

    for(let v = 0; v < graph.nodes.length; v++)
        if(graph.nodes[v].in_deg === 0)
            order.push(v)
    for(let i = 0; i < order.length; i++)
        for(const e of graph.nodes[order[i]].adj) {
            const v = e.target
            graph.nodes[v].in_deg--
            if(graph.nodes[v].in_deg === 0)
                order.push(v)
        }

    order = order.reverse()

    let maxDepth = 0

    for(const u of order) {
        let depth = 0
        for(const e of graph.nodes[u].adj) {
            const v = e.target
            if(graph.nodes[v].depth + 1 > depth)
                depth = graph.nodes[v].depth + 1
        }
        graph.nodes[u].depth = depth
        if(depth > maxDepth)
            maxDepth = depth
    }

    function applyLayering(n) {
        if(!n)
            return
        n.value = n.data.depth
        if(n.dataChildren)
            for(const c of n.dataChildren) {
                applyLayering(c.child)
            }
    }

    const dag = d3dag.dagStratify()
        .id(({index}) => index.toString())
        .parentData(({adj}) => adj.map(e => [e.target.toString(), e]))
        (graph.nodes);
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
    const defs = svgSelection.append('defs'); // For gradients

    const steps = dag.size();
    const interp = d3.interpolateRainbow;

    // How to draw edges
    const line = d3
        .line()
        .curve(d3.curveCatmullRom)
        .x((d) => d.x)
        .y((d) => d.y);

    // Plot edges
    const links = svgSelection
        .append('g')
        .selectAll('path')
        .data(dag.links())
        .enter()
        .append('path')
        .attr('d', ({ points }) => line(points))
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('class', ({source, target, data}) => {
            if(data.via_type !== undefined) {
                return 'support-edge'
            } else {
                return 'direct-edge'
            }
        })

    links
        .append('title')
        .text(({data}) => data.via_type !== undefined ? typeList[data.via_type] : undefined)

    // Select nodes
    const nodes = svgSelection
        .append('g')
        .selectAll('g')
        .data(dag.descendants())
        .enter()
        .append('g')
        .attr('transform', ({ x, y }) => `translate(${x}, ${y})`);

    // Plot node circles
    const nodeCircles = nodes
        .append('circle')

    nodeCircles
        .attr('r', nodeRadius)
        .attr('fill', d => getColorAccordingToCausalityGraphNodeType(d.data.name))

    nodes
        .append('title')
        .text(d => d.data.name)

    const textSize = 20

    // Add text to nodes
    const nodeLabels = nodes
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
        const transform = d3.zoomTransform(d3.select('#chartpanel').node());

        function transX(num)
        {
            return num * transform.k + transform.x
        }

        function transY(num)
        {
            return num * transform.k + transform.y;
        }

        nodes
            .attr('transform', ({x, y}) => `translate(${transX(x)}, ${transY(y)})`)
        nodeCircles
            .attr('r', transform.k * nodeRadius)

        links.attr('d', ({ points }) => line(points.map(({x, y}) => {return {x: transX(x), y: transY(y)}})))
            .attr('stroke-width', transform.k * 3)

        nodeLabels
            .attr('font-size', transform.k * textSize)
            .attr('x', transform.k * nodeRadius * 1.2)
        /*
        link
            .attr("x1", d => transX(d.source.x * 0.9 + d.target.x * 0.1))
            .attr("y1", d => transY(d.source.y * 0.9 + d.target.y * 0.1))
            .attr("x2", d => transX(d.target.x * 0.9 + d.source.x * 0.1))
            .attr("y2", d => transY(d.target.y * 0.9 + d.source.y * 0.1));

        node
            .attr("cx", d => transX(d.x))
            .attr("cy", d => transY(d.y));

        nodeText
            .attr("x", d => transX(d.x))
            .attr("y", d => transY(d.y));

         */
    }

    const zoom = d3.zoom().on('zoom', onZoom);
    d3.select('#chartpanel').call(zoom.transform, d3.zoomIdentity)
    d3.select('#chartpanel').call(zoom);
}

let cg


export class CutTool {

    setUniverse(universe) {
        document.getElementById('main-panel').hidden = true
        document.getElementById('loading-panel').hidden = false

        const reachabilityData = universe.causalityData.reachabilityData
        methodList = universe.causalityData.methodList
        typeList = universe.causalityData.typeList

        const codesizesDict = getMethodCodesizeDictFromReachabilityJson(reachabilityData)
        codesizes = new Array(methodList.length)

        for(let i = 0; i < methodList.length; i++) {
            codesizes[i] = codesizesDict[methodList[i]] ?? 0
        }

        universe.causalityData.nMethods = universe.causalityData.methodList.length
        universe.causalityData.nTypes = universe.causalityData.typeList.length
        cg = new CausalityGraph(universe.causalityData)

        all_reachable_res = cg.simulatePurge() // Ensure this does not get collected
        all_reachable = all_reachable_res.reachableView()
        reachable_under_selection = all_reachable
        reachable_in_image_view = reachable_under_selection

        dataRoot = generateHierarchyFromReachabilityJsonAndMethodList(reachabilityData, methodList)
        prepareListView(dataRoot)

        document.getElementById('loading-panel').hidden = true
        document.getElementById('main-panel').hidden = false
    }
}