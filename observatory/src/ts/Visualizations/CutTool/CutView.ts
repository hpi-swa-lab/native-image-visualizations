import {
    forEachInSubtree,
    FullyHierarchicalNode,
    NodeType
} from '../../UniverseTypes/CausalityGraphUniverse'
import { formatByteSizeWithUnitPrefix } from '../../util/ByteSizeFormatter'
import { assert } from '../../util/assert'
import { SortingOption } from '../../enums/Sorting'
import { useCutToolStore } from '../../stores/cutToolStore'
import { computed, toRaw, watch } from 'vue'
import {dom} from '@fortawesome/fontawesome-svg-core';

export function nodeTypeToCssString(type: NodeType): string {
    switch (type) {
        case NodeType.CgOnly:
            return 'cg-only'
        case NodeType.Class:
            return 'class'
        case NodeType.Method:
            return 'method'
        case NodeType.Package:
            return 'package'
        case NodeType.Module:
            return 'module'
        case NodeType.CustomCategory:
            return 'custom'
    }
}

class NodeData {
    readonly html: HTMLLIElement
    reachableAfterOnlyCuttingThis: undefined | number
    reachableAfterAdditionallyCuttingThis: undefined | number

    constructor(html: HTMLLIElement) {
        this.html = html
    }
}

export class CutView {
    private readonly data = new Map<FullyHierarchicalNode, NodeData>()
    private maxPurgedSize = 0

    private readonly root

    private readonly onExpanded: (v: FullyHierarchicalNode) => void
    private readonly onHover: (v: FullyHierarchicalNode | undefined) => boolean

    private readonly cutToolStore
    private readonly watchStopHandles
    private readonly sortby
    private readonly searchTerm
    private readonly selection

    constructor(
        domRoot: HTMLDivElement,
        root: FullyHierarchicalNode,
        onExpanded: (v: FullyHierarchicalNode) => void,
        onHover: (v: FullyHierarchicalNode | undefined) => boolean
    ) {
        this.root = root

        this.onExpanded = onExpanded
        this.onHover = onHover

        this.cutToolStore = useCutToolStore()
        this.sortby = computed(() => this.cutToolStore.cutview.sortby)
        this.searchTerm = computed(() => this.cutToolStore.cutview.search)
        this.selection = computed(() => this.cutToolStore.cutview.selection)
        this.watchStopHandles = [
            watch(this.sortby, (newOrder) => {
                const sortby = toRaw(newOrder)
                for (const [k, v] of this.data.entries()) {
                    this.sortChildren(sortby, k, v.html.querySelector('ul')!)
                }
                this.sortChildren(sortby, root, domRoot.querySelector('ul')!)
            }),
            watch(this.searchTerm, (newTerm) => {
                const searchString = toRaw(newTerm)

                const fitting: FullyHierarchicalNode[] = []
                forEachInSubtree(root, (v) => {
                    if(!v.fullname)
                        return
                    if(v.fullname.endsWith(searchString)) {
                        if(v.fullname.length > searchString.length) {
                            const prevChar = v.fullname[v.fullname.length - 1 - searchString.length]
                            if (prevChar !== '.' && prevChar !== '/')
                                return
                        }
                        fitting.push(v)
                    }
                })
                if(fitting.length == 1) {
                    this.expandTo(fitting[0])
                }
                for(const [v, vData] of this.data) {
                    const highlighted = searchString.length === 0 || (v.fullname && v.fullname.includes(searchString))
                    vData.html.querySelector('.cut-row')!.classList.toggle('highlight-excluded', !highlighted)
                }
            })
        ]

        const list = this.generateHtmlList(root)
        domRoot.appendChild(list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
    }

    get visibleNodes(): FullyHierarchicalNode[] {
        return [...this.data.keys()]
    }

    private static comparisonFromSortingOption(
        sortby: SortingOption
    ): (
        a: { node: FullyHierarchicalNode; data: NodeData | undefined },
        b: { node: FullyHierarchicalNode; data: NodeData | undefined }
    ) => number {
        switch (sortby) {
            case SortingOption.NAME:
                return (a, b) => {
                    if (a.node.type == b.node.type) return a.node.name.localeCompare(b.node.name)
                    if (a.node.type > b.node.type) return 1
                    else return -1
                }
            case SortingOption.SIZE:
                return (a, b) =>
                    (b.data?.reachableAfterOnlyCuttingThis ?? -1) -
                    (a.data?.reachableAfterOnlyCuttingThis ?? -1)
            default:
                throw Error('Invalid enum')
        }
    }

    public dispose() {
        for(const stopper of this.watchStopHandles)
            stopper()
    }

    public populate() {
        this.onExpanded(this.root)
    }

    public setSinglePurgeData(v: FullyHierarchicalNode, size: number) {
        const vData = this.data.get(v)
        if (!vData) return

        vData.reachableAfterOnlyCuttingThis = size
        this.increaseMaxPurgedSize(size)
        this.refreshPurgeSizeInCutOverview(vData)

        if (this.sortby.value === SortingOption.SIZE) {
            const parent = v.parent
            if (!parent) return

            // Insert this node according to its size in a sorted position:

            function lt(
                a: { size: number; name: string },
                b: { size: number; name: string }
            ): boolean {
                return a.size < b.size || (a.size === b.size && a.name > b.name)
            }

            const vComp = { size, name: v.name }

            let lowestAbove: { size: number; name: string; html: HTMLElement } | undefined
            for (const c of parent.children) {
                if (c === v) continue
                const cData = this.data.get(c)
                assert(cData !== undefined)
                const cSize = cData.reachableAfterOnlyCuttingThis
                if (!cSize) continue
                const candidate = { size: cSize, name: c.name, html: cData.html }
                if (lt(candidate, vComp)) continue
                if (lowestAbove) {
                    if (lt(lowestAbove, candidate)) continue
                }
                lowestAbove = candidate
            }

            const list = vData.html.parentElement
            assert(list !== null)
            list.insertBefore(
                vData.html,
                lowestAbove ? lowestAbove.html.nextSibling : list.children[0]
            )
        }
    }

    public setAdditionalPurgeData(v: FullyHierarchicalNode, size: number | undefined) {
        const vData = this.data.get(v)
        if (vData) {
            vData.reachableAfterAdditionallyCuttingThis = size
            this.refreshPurgeSizeInCutOverview(vData)
        }
    }

    public expandTo(v: FullyHierarchicalNode) {
        const path: FullyHierarchicalNode[] = []
        for (let cur: FullyHierarchicalNode = v; cur.parent; cur = cur.parent) {
            path.unshift(cur)
        }

        const last = path.pop()

        for (const u of path) {
            const uData = this.data.get(u)

            if(!uData || uData.html.querySelector('ul'))
                continue

            const list = this.generateHtmlList(u)
            uData.html.appendChild(list)
            list.classList.add('active')
            list.parentElement!.querySelector('.caret')!.classList.add('caret-down')
            this.onExpanded(u)
        }

        if(last) {
            const lastData = this.data.get(last)
            if(lastData)
                lastData.html.querySelector('.cut-row')!.scrollIntoView({ block: 'center' })
        }
    }

    private generateHtmlList(u: FullyHierarchicalNode) {
        const ul = document.createElement('ul')
        ul.classList.add('nested', 'active')

        for (const v of u.children) {
            ul.appendChild(this.generateHtmlListItem(v))
        }

        return ul
    }

    private generateHtmlListItem(v: FullyHierarchicalNode) {
        const li = document.createElement('li')
        const cutData = new NodeData(li)
        this.data.set(v, cutData)

        const row = document.createElement('div')
        row.className = 'cut-row'
        const searchTerm = toRaw(this.searchTerm.value)
        const highlighted = searchTerm.length === 0
            || (v.fullname && v.fullname.includes(searchTerm))
        row.classList.toggle('highlight-excluded', !highlighted)
        li.appendChild(row)

        const cutSizeColumn = document.createElement('span')
        cutSizeColumn.className = 'cut-size-column'
        row.appendChild(cutSizeColumn)

        const cutSizeBar = document.createElement('div')
        cutSizeBar.className = 'cut-size-bar'
        row.appendChild(cutSizeBar)

        const node = v
        const span = document.createElement('span')
        span.className = 'caret'
        if (v.children.length) {
            span.addEventListener('click', () => {
                const expanded = span.classList.toggle('caret-down')
                if (expanded) {
                    const list = this.generateHtmlList(node)
                    li.appendChild(list)
                    this.onExpanded(node)
                } else {
                    const list = li.querySelector('ul')!
                    li.removeChild(list)

                    for (const c of node.children)
                        forEachInSubtree(c, (w) => {
                            this.data.delete(w)
                            this.cutToolStore.deleteCutviewSelection(w)
                        })
                }
            })
        } else {
            span.style.visibility = 'hidden'
        }
        row.appendChild(span)

        const typeSymbolSpan = document.createElement('span')
        row.appendChild(typeSymbolSpan)
        typeSymbolSpan.classList.add('type-symbol')
        typeSymbolSpan.classList.add(nodeTypeToCssString(v.type))

        const nameSpan = document.createElement('span')
        nameSpan.appendChild(document.createTextNode(v.name ?? ''))
        if (v.fullname) nameSpan.title = v.fullname

        const selectableSpan = document.createElement('span')
        selectableSpan.appendChild(nameSpan)
        selectableSpan.classList.add('selectable', 'cutview-node')
        if (node.cgOnly) selectableSpan.classList.add('cg-only')
        if (node.synthetic) selectableSpan.classList.add('synthetic')
        row.appendChild(selectableSpan)

        selectableSpan.addEventListener('mouseenter', async () => {
            if (this.selection.value.has(node)) return

            if (this.onHover(v)) {
                selectableSpan.classList.add('hovered-for-purge')
            }
        })

        selectableSpan.addEventListener('mouseleave', async () => {
            selectableSpan.classList.remove('hovered-for-purge')

            if (this.selection.value.has(node)) return

            this.onHover(undefined)
        })

        selectableSpan.addEventListener('click', () => {
            selectableSpan.classList.remove('hovered-for-purge')
            const selected = this.cutToolStore.toggleCutviewSelection(node)
            selectableSpan.classList.toggle('selected-for-purge', selected)
        })

        return li
    }

    private increaseMaxPurgedSize(size: number) {
        if (this.maxPurgedSize && size <= this.maxPurgedSize) return
        this.maxPurgedSize = size

        for (const v of this.data.values()) {
            this.refreshPurgeSizeInCutOverview(v)
        }
    }

    private refreshPurgeSizeInCutOverview(cutData: NodeData) {
        const html = cutData.html

        const purged =
            this.selection.value.size > 0
                ? cutData.reachableAfterAdditionallyCuttingThis
                : cutData.reachableAfterOnlyCuttingThis

        let text = null
        let width = '0'
        if (purged !== undefined) {
            text = formatByteSizeWithUnitPrefix(purged)
            width = (purged / this.maxPurgedSize) * 100 + '%'
        }
        html.querySelector<HTMLSpanElement>('.cut-size-column')!.textContent = text
        html.querySelector<HTMLDivElement>('.cut-size-bar')!.style.width = width
    }

    private sortChildren(sortby: SortingOption, u: FullyHierarchicalNode, uHtml: HTMLUListElement) {
        const sorted = u.children
            .map((v) => {
                return { node: v, data: this.data.get(v) }
            })
            .sort(CutView.comparisonFromSortingOption(sortby))
        for (const { data } of sorted) {
            if (data) uHtml.appendChild(data.html)
        }
    }
}
