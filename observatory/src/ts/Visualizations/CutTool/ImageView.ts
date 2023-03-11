import {collectCgNodesInSubtree, FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {formatByteSizeWithUnitPrefix} from '../../util/ByteSizeFormatter';



function forEachInSubtreePostorder
    <TNode extends { children: TNode[] }, TResult>(
        node: TNode, expandCallback: (v: TNode) => boolean,
        callback: (v: TNode, childResults: (TResult | undefined)[]) => TResult)
            : TResult | undefined {
    if(!expandCallback(node))
        return undefined
    const childrenResults: (TResult | undefined)[] = new Array(node.children.length)
    for(let i = 0; i < node.children.length; i++)
        childrenResults[i] = forEachInSubtreePostorder(node.children[i], expandCallback, callback)
    return callback(node, childrenResults)
}

function forEachInStrictSubtreePostorder
    <TNode extends { children: TNode[] }, TResult>(
        node: TNode, expandCallback: (v: TNode) => boolean,
        callback: (v: TNode, childResults: (TResult | undefined)[]) => TResult) {

    for(const c of node.children)
        forEachInSubtreePostorder(c, expandCallback, callback)
}

class ImageViewData
{
    html: HTMLLIElement
    exclusiveTransitiveCgNodes: number[] | undefined

    constructor(html: HTMLLIElement, exclusiveTransitiveCgNodes?: number[]) {
        this.html = html
        this.exclusiveTransitiveCgNodes = exclusiveTransitiveCgNodes
    }
}

export class ImageView {
    private readonly root: FullyHierarchicalNode
    private readonly codesizes: number[]
    private readonly maxCodeSize: number
    private readonly imageviewData = new Map<FullyHierarchicalNode, ImageViewData>()
    private detailSelectedElement?: HTMLElement
    private readonly selectedNodeChange: (v: FullyHierarchicalNode | undefined) => void

    private readonly allReachable: Uint8Array
    private reachableWithSelectedPurged: Uint8Array
    private reachableWithHoveredPurged: Uint8Array

    constructor(allReachable: Uint8Array,
                root: FullyHierarchicalNode,
                codesizes: number[],
                maxCodeSize: number,
                selectedNodeChange: (v: FullyHierarchicalNode | undefined) => void) {
        this.root = root
        this.maxCodeSize = maxCodeSize
        this.allReachable = allReachable
        this.reachableWithSelectedPurged = allReachable
        this.reachableWithHoveredPurged = allReachable
        this.codesizes = codesizes
        this.selectedNodeChange = selectedNodeChange
    }

    public populate(domRoot: HTMLDivElement) {
        const list = this.generateHtmlImageview(this.root)
        domRoot.appendChild(list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
    }

    public updateReachableSets(
        reachableWithSelectedPurged: Uint8Array | undefined | null,
        reachableWithHoveredPurged: Uint8Array | undefined | null) {
        if(reachableWithSelectedPurged !== undefined)
            this.reachableWithSelectedPurged = reachableWithSelectedPurged ?? this.allReachable
        if(reachableWithHoveredPurged !== undefined)
            this.reachableWithHoveredPurged =
                reachableWithHoveredPurged ?? this.reachableWithSelectedPurged
        this.updatePurgeValues(this.root)
    }

    private updatePurgeValues(root: FullyHierarchicalNode) {
        forEachInStrictSubtreePostorder<FullyHierarchicalNode, SizeInfo | undefined>(
            root,
            u => this.imageviewData.get(u) !== undefined,
            (u, childResults) => this.refreshPurgeValueForImageviewNode(u, childResults))
    }

    private generateHtmlImageview(data: FullyHierarchicalNode) {
        const ul = document.createElement('ul')
        ul.className = 'nested'

        const imageViewDataEntry = this.imageviewData.get(data)
        if (imageViewDataEntry)
            delete imageViewDataEntry.exclusiveTransitiveCgNodes

        for(const d of data.children) {
            if(d.cgOnly)
                continue
            ul.appendChild(this.generateHtmlImageviewForNode(d))
        }

        const childSizes = data.children.filter(d => !d.cgOnly).map(cn => cn.size)

        const order = new Array(childSizes.length)
        for(let i = 0; i < order.length; i++)
            order[i] = i

        const nodes = ul.children
        order
            .sort((a, b) => childSizes[b] - childSizes[a]).map(i => nodes[i])
            .forEach(node => ul.appendChild(node))

        return ul
    }

    private generateHtmlImageviewForNode(d: FullyHierarchicalNode): HTMLLIElement {
        const li = document.createElement('li')
        const viewData = new ImageViewData(li, collectCgNodesInSubtree(d))
        this.imageviewData.set(d, viewData)
        li.className = 'image-row'
        const span = document.createElement('span')
        li.appendChild(span)

        {
            const totalSizeColumn = document.createElement('span')
            totalSizeColumn.className = 'total-size-column'
            totalSizeColumn.textContent = formatByteSizeWithUnitPrefix(d.size)
            li.appendChild(totalSizeColumn)
        }

        {
            const sizeBarOuter = document.createElement('div')
            sizeBarOuter.className = 'size-bar-outer'
            sizeBarOuter.style.width = (d.size / this.maxCodeSize * 100) + '%'
            li.appendChild(sizeBarOuter)

            for(let i = 0; i < 3; i++) {
                const sizeBarInner = document.createElement('div')
                sizeBarInner.className = `size-bar-inner-${i}`
                sizeBarOuter.appendChild(sizeBarInner)
            }
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
        if (d.children && d.children.some(c => !c.cgOnly)) {
            span.addEventListener('click', () => {
                const expanded = span.classList.toggle('caret-down');
                if(!li.querySelector('.nested') && expanded) {
                    li.appendChild(this.generateHtmlImageview(node))
                    this.updatePurgeValues(node)
                }
                li.querySelector('.nested')!.classList.toggle('active');
            });
        } else {
            span.style.visibility = 'hidden'
        }
        li.appendChild(span)

        const nameSpan = document.createElement('span')
        nameSpan.appendChild(document.createTextNode(d.name ?? ''))
        if(d.fullname)
            nameSpan.title = d.fullname

        const selectableSpan = document.createElement('span')
        selectableSpan.appendChild(nameSpan)
        selectableSpan.classList.add('imageview-node')
        li.appendChild(selectableSpan)

        selectableSpan.classList.add('selectable')
        selectableSpan.addEventListener('click', () => {
            const added = selectableSpan.classList.toggle('selected-for-detail')

            if (added) {
                if(this.detailSelectedElement)
                    this.detailSelectedElement.querySelector<HTMLSpanElement>('.imageview-node')!
                        .classList.remove('selected-for-detail')
                selectableSpan.classList.add('selected-for-detail')
                if(this.selectedNodeChange)
                    this.selectedNodeChange(node)
                this.detailSelectedElement = this.imageviewData.get(node)!.html
            } else {
                this.detailSelectedElement = undefined
                if(this.selectedNodeChange)
                    this.selectedNodeChange(undefined)
            }
        })

        return li
    }

    private sumPurged(reachable: Uint8Array | undefined, cgNodes: number[]) {
        if(reachable === undefined)
            return 0

        let sum = 0
        if (reachable) {
            for (const i of cgNodes)
                if (reachable[i] === 0xFF)
                    sum += this.codesizes[i]
        }
        return sum
    }

    private refreshPurgeValueForImageviewNode(
        u: FullyHierarchicalNode,
        childResults: (SizeInfo | undefined)[]): SizeInfo | undefined {

        const uData = this.imageviewData.get(u)
        if(uData === undefined)
            return

        let results: SizeInfo
        const reachableArrs = [
            this.allReachable,
            this.reachableWithSelectedPurged,
            this.reachableWithHoveredPurged
        ]

        if(uData.exclusiveTransitiveCgNodes) {
            results = reachableArrs
                .map(reachable => this.sumPurged(reachable, uData.exclusiveTransitiveCgNodes!)
            ) as SizeInfo
        } else {
            results = reachableArrs.map(
                reachable => this.sumPurged(reachable, u.cgNode ? [u.cgNode] : [])
            ) as SizeInfo
            for(const cr of childResults)
                if(cr)
                    for(let i = 0; i < 3; i++)
                        results[i] += cr[i]
        }
        const html = uData.html

        const [purgedBaseline, purgedWithSelection, purgedWithHover] = results

        const purgedPercentage0 = 100 * purgedBaseline / u.size
        const purgedPercentage1 = 100 * (purgedWithSelection - purgedBaseline) / u.size
        const purgedPercentage2 = 100 * (purgedWithHover - purgedWithSelection) / u.size
        const purgedPercentageTotal = purgedPercentage1 + purgedPercentage2
        let barWidth0 = '0'
        let barWidth1 = '0'
        let barWidth2 = '0'
        let barWidthTotal = '0'
        let percentageText = ''
        if (u.size !== 0) {
            barWidth0 = purgedPercentage0.toFixed(1) + '%'
            barWidth1 = purgedPercentage1.toFixed(1) + '%'
            barWidth2 = purgedPercentage2.toFixed(1) + '%'
            barWidthTotal = purgedPercentageTotal.toFixed(1) + '%'
            percentageText = purgedPercentageTotal === 0 ? '' : purgedPercentageTotal.toFixed(1) + ' %'
        }
        html.querySelector<HTMLSpanElement>('.purge-percentage-bar-text')!.textContent = percentageText
        html.querySelector<HTMLDivElement>('.purge-percentage-bar-inner')!.style.width = barWidthTotal
        html.querySelector<HTMLDivElement>('.size-bar-inner-0')!.style.width = barWidth0
        html.querySelector<HTMLDivElement>('.size-bar-inner-1')!.style.width = barWidth1
        html.querySelector<HTMLDivElement>('.size-bar-inner-2')!.style.width = barWidth2
        const cl = html.querySelector<HTMLDivElement>('.imageview-node')!.classList
        if(purgedWithSelection >= u.size && purgedWithSelection > 0) {
            cl.add('purged')
        } else {
            cl.remove('purged')
        }

        return results
    }
}

type SizeInfo = [purgedBaseline: number, purgedWithSelection: number, purgedWithHover: number]