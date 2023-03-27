/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    collectSubtree,
    forEachInSubtree,
    FullyHierarchicalNode
} from '../../UniverseTypes/CausalityGraphUniverse'
import { formatByteSizeWithUnitPrefix } from '../../util/ByteSizeFormatter'
import { NodeSet, PurgeResults } from './BatchPurgeScheduler'
import { nodeTypeToCssString } from './CutView'
import { SortingOption } from '../../enums/Sorting'
import { useCutToolStore } from '../../stores/cutToolStore'
import { computed, toRaw, watch } from 'vue'

function forEachInSubtreePostorder<TNode extends { children: TNode[] }, TResult>(
    node: TNode,
    expandCallback: (v: TNode) => boolean,
    callback: (v: TNode, childResults: (TResult | undefined)[]) => TResult
): TResult | undefined {
    if (!expandCallback(node)) return undefined
    const childrenResults: (TResult | undefined)[] = new Array(node.children.length)
    for (let i = 0; i < node.children.length; i++)
        childrenResults[i] = forEachInSubtreePostorder(node.children[i], expandCallback, callback)
    return callback(node, childrenResults)
}

function forEachInStrictSubtreePostorder<TNode extends { children: TNode[] }, TResult>(
    node: TNode,
    expandCallback: (v: TNode) => boolean,
    callback: (v: TNode, childResults: (TResult | undefined)[]) => TResult
) {
    for (const c of node.children) forEachInSubtreePostorder(c, expandCallback, callback)
}

class ImageViewData {
    html: HTMLElement
    collapsedChildren: NodeSet | undefined

    constructor(html: HTMLElement, collapsedChildNodes?: NodeSet) {
        this.html = html
        this.collapsedChildren = collapsedChildNodes
    }
}

export class ImageView {
    private readonly root: FullyHierarchicalNode
    private readonly codesizes: number[]
    private readonly maxCodeSize: number
    private readonly imageviewData = new Map<FullyHierarchicalNode, ImageViewData>()

    private readonly allReachable: PurgeResults
    private reachableWithSelectedPurged: PurgeResults
    private reachableWithHoveredPurged: PurgeResults
    private readonly watchStopHandles
    private readonly sortby
    private readonly selectedNode
    private readonly searchTerm
    private readonly cutToolStore

    constructor(
        allReachable: PurgeResults,
        domRoot: HTMLDivElement,
        root: FullyHierarchicalNode,
        codesizes: number[],
        maxCodeSize: number
    ) {
        this.root = root
        this.maxCodeSize = maxCodeSize
        this.allReachable = allReachable
        this.reachableWithSelectedPurged = allReachable
        this.reachableWithHoveredPurged = allReachable
        this.codesizes = codesizes

        this.cutToolStore = useCutToolStore()
        this.sortby = computed(() => this.cutToolStore.imageview.sortby)
        this.selectedNode = computed(() => this.cutToolStore.detailview.selected)
        this.searchTerm = computed(() => this.cutToolStore.imageview.search)
        this.watchStopHandles = [
            watch(this.sortby, (newOrder) => {
                this.changeSortby(toRaw(newOrder))
            }),
            watch(this.selectedNode, (newSelection, oldSelection) => {
                const u = toRaw(oldSelection)
                const v = toRaw(newSelection)

                if (u) {
                    const uData = this.imageviewData.get(u)
                    if (uData) {
                        uData.html
                            .querySelector<HTMLSpanElement>('.imageview-node')!
                            .classList.remove('selected-for-detail')
                    }
                }

                if (v) {
                    const uData = this.imageviewData.get(v)
                    if (uData)
                        uData.html
                            .querySelector('.imageview-node')!
                            .classList.add('selected-for-detail')
                }
            }),
            watch(this.searchTerm, (newTerm) => {
                const searchString = toRaw(newTerm)

                if (searchString.length) {
                    const fitting: FullyHierarchicalNode[] = []
                    forEachInSubtree(this.root, (v) => {
                        if (!v.fullname) return
                        if (v.fullname.endsWith(searchString)) {
                            if (v.fullname.length > searchString.length) {
                                const prevChar =
                                    v.fullname[v.fullname.length - 1 - searchString.length]
                                if (prevChar !== '.' && prevChar !== '/') return
                            }
                            fitting.push(v)
                        }
                    })
                    if (fitting.length == 1) {
                        this.expandTo(fitting[0])
                    }
                }

                for (const [v, vData] of this.imageviewData) {
                    const highlighted =
                        searchString.length === 0 ||
                        (v.fullname && v.fullname.includes(searchString))
                    vData.html
                        .querySelector('.image-row')!
                        .classList.toggle('highlight-excluded', !highlighted)
                }
            })
        ]

        this.imageviewData.set(this.root, new ImageViewData(domRoot))
        const list = this.generateHtmlImageview(this.root)
        this.updatePurgeValues(this.root)
        domRoot.appendChild(list)
        this.sortChildren(this.sortby.value, root, list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')

        if (this.selectedNode.value) {
            this.expandTo(toRaw(this.selectedNode.value))
            this.imageviewData
                .get(toRaw(this.selectedNode.value))!
                .html.querySelector('.imageview-node')!
                .classList.add('selected-for-detail')
        }
    }

    private static comparisonFromSortingOption(
        sortby: SortingOption
    ): (a: FullyHierarchicalNode, b: FullyHierarchicalNode) => number {
        switch (sortby) {
            case SortingOption.NAME:
                return (a, b) => {
                    if (a.type == b.type) return a.name.localeCompare(b.name)
                    if (a.type > b.type) return 1
                    else return -1
                }
            case SortingOption.SIZE:
                return (a, b) => b.accumulatedSize - a.accumulatedSize
            default:
                throw Error('Invalid enum')
        }
    }

    public updateReachableSets(
        reachableWithSelectedPurged: PurgeResults | undefined | null,
        reachableWithHoveredPurged: PurgeResults | undefined | null
    ) {
        if (reachableWithSelectedPurged !== undefined)
            this.reachableWithSelectedPurged = reachableWithSelectedPurged ?? this.allReachable
        if (reachableWithHoveredPurged !== undefined)
            this.reachableWithHoveredPurged =
                reachableWithHoveredPurged ?? this.reachableWithSelectedPurged
        this.updatePurgeValues(this.root)
    }

    public dispose() {
        for (const stopper of this.watchStopHandles) stopper()
    }

    public expandTo(v: FullyHierarchicalNode) {
        const path: FullyHierarchicalNode[] = []
        for (let cur: FullyHierarchicalNode = v; cur.parent; cur = cur.parent) {
            path.unshift(cur)
        }

        const last = path.pop()

        for (const u of path) {
            const uData = this.imageviewData.get(u)

            if (!uData || uData.html.querySelector('ul')) continue

            const list = this.generateHtmlImageview(u)
            uData.html.appendChild(list)
            list.classList.add('active')
            list.parentElement!.querySelector('.caret')!.classList.add('caret-down')
        }

        if (last) {
            const lastData = this.imageviewData.get(last)
            if (lastData)
                lastData.html.querySelector('.image-row')!.scrollIntoView({ block: 'center' })
        }
    }

    private updatePurgeValues(root: FullyHierarchicalNode) {
        forEachInStrictSubtreePostorder<FullyHierarchicalNode, SizeInfo | undefined>(
            root,
            (u) => this.imageviewData.get(u) !== undefined,
            (u, childResults) => this.refreshPurgeValueForImageviewNode(u, childResults)
        )
    }

    private generateHtmlImageview(u: FullyHierarchicalNode) {
        const ul = document.createElement('ul')
        ul.className = 'nested'

        const imageViewDataEntry = this.imageviewData.get(u)
        if (imageViewDataEntry) delete imageViewDataEntry.collapsedChildren

        for (const v of u.children) {
            if (v.cgOnly) continue
            ul.appendChild(this.generateHtmlImageviewForNode(v))
        }

        return ul
    }

    private generateHtmlImageviewForNode(v: FullyHierarchicalNode): HTMLLIElement {
        const li = document.createElement('li')
        const viewData = new ImageViewData(li, new NodeSet(collectSubtree(v)))
        this.imageviewData.set(v, viewData)

        const row = document.createElement('div')
        row.className = 'image-row'
        const searchTerm = toRaw(this.searchTerm.value)
        const highlighted =
            searchTerm.length === 0 || (v.fullname && v.fullname.includes(searchTerm))
        row.classList.toggle('highlight-excluded', !highlighted)
        li.appendChild(row)

        const span = document.createElement('span')
        row.appendChild(span)

        const typeSymbolSpan = document.createElement('span')
        row.appendChild(typeSymbolSpan)
        typeSymbolSpan.classList.add('type-symbol')
        typeSymbolSpan.classList.add(nodeTypeToCssString(v.type))

        {
            const totalSizeColumn = document.createElement('span')
            totalSizeColumn.className = 'total-size-column'
            totalSizeColumn.textContent = formatByteSizeWithUnitPrefix(v.accumulatedSize)
            row.appendChild(totalSizeColumn)
        }

        {
            const sizeBarOuter = document.createElement('div')
            sizeBarOuter.className = 'size-bar-outer'
            sizeBarOuter.style.width = (v.accumulatedSize / this.maxCodeSize) * 100 + '%'
            row.appendChild(sizeBarOuter)

            for (let i = 0; i < 3; i++) {
                const sizeBarInner = document.createElement('div')
                sizeBarInner.className = `size-bar-inner-${i}`
                sizeBarOuter.appendChild(sizeBarInner)
            }
        }

        {
            const purgePercentageBarOuter = document.createElement('div')
            purgePercentageBarOuter.className = 'purge-percentage-bar-outer'
            row.appendChild(purgePercentageBarOuter)

            const purgePercentageBarInner = document.createElement('div')
            purgePercentageBarInner.className = 'purge-percentage-bar-inner'
            purgePercentageBarOuter.appendChild(purgePercentageBarInner)

            const purgePercentageBarText = document.createElement('span')
            purgePercentageBarText.className = 'purge-percentage-bar-text'
            purgePercentageBarOuter.appendChild(purgePercentageBarText)
        }

        const node = v
        span.className = 'caret'
        if (v.children && v.children.some((c) => !c.cgOnly)) {
            span.addEventListener('click', () => {
                const expanded = span.classList.toggle('caret-down')
                if (!li.querySelector('.nested') && expanded) {
                    const ul = this.generateHtmlImageview(node)
                    li.appendChild(ul)
                    this.sortChildren(this.sortby.value, node, ul)
                    this.updatePurgeValues(node)
                }
                li.querySelector('.nested')!.classList.toggle('active')
            })
        } else {
            span.style.visibility = 'hidden'
        }
        row.appendChild(span)

        const nameSpan = document.createElement('span')
        nameSpan.appendChild(document.createTextNode(v.name ?? ''))
        nameSpan.className = 'imageview-name'
        if (v.fullname) nameSpan.title = v.fullname

        const selectableSpan = document.createElement('span')
        selectableSpan.appendChild(nameSpan)
        selectableSpan.classList.add('imageview-node')
        row.appendChild(selectableSpan)

        if (!node.cgNode) selectableSpan.classList.add('no-cg')

        selectableSpan.classList.add('selectable')
        selectableSpan.addEventListener('click', () => {
            const added = !selectableSpan.classList.contains('selected-for-detail')
            this.cutToolStore.setDetailSelectedNode(added ? node : undefined)
        })

        return li
    }

    private refreshPurgeValueForImageviewNode(
        u: FullyHierarchicalNode,
        childResults: (SizeInfo | undefined)[]
    ): SizeInfo | undefined {
        const uData = this.imageviewData.get(u)
        if (uData === undefined) return

        let results: SizeInfo
        const reachableArrs = [
            this.allReachable,
            this.reachableWithSelectedPurged,
            this.reachableWithHoveredPurged
        ]

        if (uData.collapsedChildren) {
            results = reachableArrs.map((reachable) => {
                return {
                    size: reachable.accumulatedSizeOfPurgedNodes(uData.collapsedChildren!),
                    all: reachable.allPurged(uData.collapsedChildren!)
                }
            }) as SizeInfo
        } else {
            results = reachableArrs.map((reachable) => {
                return {
                    size: reachable.isPurged(u) ? u.size : 0,
                    all: !u.cgNode || reachable.isPurged(u)
                }
            }) as SizeInfo
            for (const cr of childResults)
                if (cr)
                    for (let i = 0; i < results.length; i++) {
                        results[i].size += cr[i].size
                        results[i].all &&= cr[i].all
                    }
        }
        const html = uData.html

        const [baseline, withSelection, withHover] = results

        const purgedPercentage0 = (100 * baseline.size) / u.accumulatedSize
        const purgedPercentage1 = (100 * (withSelection.size - baseline.size)) / u.accumulatedSize
        const purgedPercentage2 = (100 * (withHover.size - withSelection.size)) / u.accumulatedSize
        const purgedPercentageTotal = purgedPercentage1 + purgedPercentage2
        let barWidth0 = '0'
        let barWidth1 = '0'
        let barWidth2 = '0'
        let barWidthTotal = '0'
        let percentageText = ''
        if (u.accumulatedSize !== 0) {
            barWidth0 = purgedPercentage0.toFixed(1) + '%'
            barWidth1 = purgedPercentage1.toFixed(1) + '%'
            barWidth2 = purgedPercentage2.toFixed(1) + '%'
            barWidthTotal = purgedPercentageTotal.toFixed(1) + '%'
            percentageText =
                purgedPercentageTotal === 0 ? '' : purgedPercentageTotal.toFixed(1) + ' %'
        }
        html.querySelector<HTMLSpanElement>('.purge-percentage-bar-text')!.textContent =
            percentageText
        html.querySelector<HTMLDivElement>('.purge-percentage-bar-inner')!.style.width =
            barWidthTotal
        html.querySelector<HTMLDivElement>('.size-bar-inner-0')!.style.width = barWidth0
        html.querySelector<HTMLDivElement>('.size-bar-inner-1')!.style.width = barWidth1
        html.querySelector<HTMLDivElement>('.size-bar-inner-2')!.style.width = barWidth2

        const cl = html.querySelector('.imageview-node')!.classList
        const classNames = ['purged-baseline', 'purged-with-selection', 'purged-with-hover']
        let inhibited = false
        for (let i = 0; i < 3; i++) {
            cl.toggle(classNames[i], !inhibited && results[i].all)
            inhibited ||= results[i].all
        }
        cl.toggle('affected-by-hover', results[2].size > results[1].size)

        return results
    }

    private sortChildren(sortby: SortingOption, u: FullyHierarchicalNode, uHtml: HTMLUListElement) {
        const sorted = u.children.sort(ImageView.comparisonFromSortingOption(sortby))
        for (const v of sorted) {
            const vData = this.imageviewData.get(v)
            if (vData) uHtml.appendChild(vData.html)
        }
    }

    private changeSortby(sortby: SortingOption) {
        for (const [k, v] of this.imageviewData.entries()) {
            this.sortChildren(sortby, k, v.html.querySelector('ul')!)
        }
    }
}

type PurgeInfo = { size: number; all: boolean }
type SizeInfo = [baseline: PurgeInfo, withSelection: PurgeInfo, withHover: PurgeInfo]
