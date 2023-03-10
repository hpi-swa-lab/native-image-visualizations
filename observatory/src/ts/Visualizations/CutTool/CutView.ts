import {FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {formatByteSizeWithUnitPrefix} from '../../util/ByteSizeFormatter';


interface CutViewData
{
    html: HTMLLIElement
    reachable_after_cutting_this: undefined | number
    reachable_after_additionally_cutting_this: undefined | number
}

export class CutView {
    precomputeCutoffs = true
    selectedForPurging: Set<FullyHierarchicalNode> = new Set()

    cutviewData: Map<FullyHierarchicalNode, CutViewData> = new Map<FullyHierarchicalNode, CutViewData>()
    maxPurgedSize = 0

    selectionChanged?: (v: FullyHierarchicalNode | undefined) => void
    onHover?: (v: FullyHierarchicalNode | undefined) => boolean
    onExpanded?: (v: FullyHierarchicalNode) => void

    constructor(domRoot: HTMLDivElement, root: FullyHierarchicalNode) {
        const list = this.generateHtmlCutview(root)
        domRoot.appendChild(list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
    }


    setSinglePurgeData(v: FullyHierarchicalNode, size: number) {
        const vCutData = this.cutviewData.get(v)
        if(!vCutData)
            return

        vCutData.reachable_after_cutting_this = size
        this.increaseMaxPurgedSize(size)
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
            if(comp < size)
                continue
            if(comp < highestBelowSize) {
                highestBelow = cCutData.html
                highestBelowSize = comp
            }
        }

        const list = vCutData.html.parentElement!
        list.insertBefore(vCutData.html, highestBelow ? highestBelow.nextSibling : list.children[0])
    }

    setAdditionalPurgeData(v: FullyHierarchicalNode, size: number | undefined) {
        const vCutData = this.cutviewData.get(v)
        if(vCutData) {
            vCutData.reachable_after_additionally_cutting_this = size
            this.refreshPurgeSizeInCutOverview(vCutData)
        }
    }

    public expandTo(v: FullyHierarchicalNode) {
        const path: FullyHierarchicalNode[] = []
        for(let cur: FullyHierarchicalNode = v; cur.parent; cur = cur.parent) {
            path.unshift(cur)
        }

        path.pop()

        for(let i = 0; i < path.length; i++) {
            const list = this.generateHtmlCutview(path[i])
            this.cutviewData.get(path[i])!.html.appendChild(list)
            list.classList.add('active')
            list.parentElement!.querySelector('.caret')!.classList.add('caret-down')
        }
    }

    private generateHtmlCutview(u: FullyHierarchicalNode) {
        const ul = document.createElement('ul')
        ul.className = 'nested'

        for(const v of u.children) {
            ul.appendChild(this.generateHtmlCutviewNode(v))
        }

        return ul
    }

    private generateHtmlCutviewNode(d: FullyHierarchicalNode) {
        const li = document.createElement('li')
        const cutData: CutViewData = { html: li, reachable_after_additionally_cutting_this: undefined, reachable_after_cutting_this: undefined }
        this.cutviewData.set(d, cutData)
        li.className = 'cut-row'

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
                const expanded = span.classList.toggle('caret-down');
                if(!span.parentElement!.querySelector('.nested') && expanded) {
                    const list = this.generateHtmlCutview(node)
                    li.appendChild(list)
                    if(this.onExpanded)
                        this.onExpanded(node)
                }
                span.parentElement!.querySelector('.nested')!.classList.toggle('active');
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
        if(node.synthetic)
            nameSpan.classList.add('synthetic')

        li.appendChild(nameSpan)

        nameSpan.addEventListener('mouseenter', async () => {
            if(this.selectedForPurging.has(node))
                return;

            if(this.onHover && this.onHover(d)) {
                nameSpan.classList.add('hovered-for-purge')
            }
        })

        nameSpan.addEventListener('mouseleave', async () => {
            nameSpan.classList.remove('hovered-for-purge')

            if(this.selectedForPurging.has(node))
                return;

            if(this.onHover)
                this.onHover(undefined)
        })

        nameSpan.addEventListener('click', () => {
            nameSpan.classList.remove('hovered-for-purge')
            const selected = nameSpan.classList.toggle('selected-for-purge')
            if (selected) {
                this.selectedForPurging.add(node)
            } else {
                this.selectedForPurging.delete(node)
            }

            if(this.selectionChanged)
                return this.selectionChanged(selected ? d : undefined)
        })

        return li
    }

    private refreshPurgeSizeInCutOverview(cutData: CutViewData) {
        const html = cutData.html

        const purged = this.selectedForPurging.size > 0 && this.precomputeCutoffs ? cutData.reachable_after_additionally_cutting_this : cutData.reachable_after_cutting_this

        let text = null
        let width = '0'
        if(purged) {
            text = formatByteSizeWithUnitPrefix(purged)
            width = (purged / this.maxPurgedSize * 100) + '%'
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
}