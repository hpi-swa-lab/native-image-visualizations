import {forEachInSubtree, FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {formatByteSizeWithUnitPrefix} from '../../util/ByteSizeFormatter';
import {assert} from '../../util/assert';


class NodeData
{
    readonly html: HTMLLIElement
    reachableAfterOnlyCuttingThis: undefined | number
    reachableAfterAdditionallyCuttingThis: undefined | number

    constructor(html: HTMLLIElement) {
        this.html = html;
    }
}

export class CutView {
    selectedForPurging: Set<FullyHierarchicalNode> = new Set()

    private readonly data = new Map<FullyHierarchicalNode, NodeData>()
    private maxPurgedSize = 0

    private readonly onExpanded: (v: FullyHierarchicalNode) => void
    private readonly selectionChanged: (v: FullyHierarchicalNode | undefined) => void
    private readonly onHover: (v: FullyHierarchicalNode | undefined) => boolean

    constructor(onExpanded: (v: FullyHierarchicalNode) => void,
                selectionChanged: (v: FullyHierarchicalNode | undefined) => void,
                onHover: (v: FullyHierarchicalNode | undefined) => boolean) {
        this.onExpanded = onExpanded
        this.selectionChanged = selectionChanged
        this.onHover = onHover
    }

    get visibleNodes(): IterableIterator<FullyHierarchicalNode> {
        return this.data.keys()
    }

    public populate(domRoot: HTMLDivElement, root: FullyHierarchicalNode) {
        const list = this.generateHtmlList(root)
        domRoot.appendChild(list)
        list.classList.remove('nested')
        list.classList.add('unpadded')
        list.classList.add('active')
        this.onExpanded(root)
    }

    public setSinglePurgeData(v: FullyHierarchicalNode, size: number) {
        const vData = this.data.get(v)
        if(!vData)
            return

        vData.reachableAfterOnlyCuttingThis = size
        this.increaseMaxPurgedSize(size)
        this.refreshPurgeSizeInCutOverview(vData)

        const parent = v.parent
        if(!parent)
            return

        // Insert this node according to its size in a sorted position:

        function lt(a: { size: number, name: string }, b: { size: number, name: string }): boolean {
            return a.size < b.size || a.size === b.size && a.name > b.name
        }

        const vComp = { size, name: v.name }

        let lowestAbove: { size: number, name: string, html: HTMLElement } | undefined
        for(const c of parent.children) {
            if(c === v)
                continue
            const cData = this.data.get(c)
            assert(cData !== undefined)
            const cSize = cData.reachableAfterOnlyCuttingThis
            if(!cSize)
                continue
            const candidate = { size: cSize, name: c.name, html: cData.html }
            if(lt(candidate, vComp))
                continue
            if(lowestAbove) {
                if(lt(lowestAbove, candidate))
                    continue
            }
            lowestAbove = candidate
        }

        const list = vData.html.parentElement
        assert(list !== null)
        list.insertBefore(vData.html, lowestAbove ? lowestAbove.html.nextSibling : list.children[0])
    }

    public setAdditionalPurgeData(v: FullyHierarchicalNode, size: number | undefined) {
        const vData = this.data.get(v)
        if(vData) {
            vData.reachableAfterAdditionallyCuttingThis = size
            this.refreshPurgeSizeInCutOverview(vData)
        }
    }

    public expandTo(v: FullyHierarchicalNode) {
        const path: FullyHierarchicalNode[] = []
        for(let cur: FullyHierarchicalNode = v; cur.parent; cur = cur.parent) {
            path.unshift(cur)
        }

        path.pop()

        for(let i = 0; i < path.length; i++) {
            const list = this.generateHtmlList(path[i])
            this.data.get(path[i])!.html.appendChild(list)
            list.classList.add('active')
            list.parentElement!.querySelector('.caret')!.classList.add('caret-down')
            this.onExpanded(path[i])
        }
    }

    private generateHtmlList(u: FullyHierarchicalNode) {
        const ul = document.createElement('ul')
        ul.classList.add('nested', 'active')

        for(const v of u.children) {
            ul.appendChild(this.generateHtmlListItem(v))
        }

        return ul
    }

    private generateHtmlListItem(d: FullyHierarchicalNode) {
        const li = document.createElement('li')
        const cutData = new NodeData(li)
        this.data.set(d, cutData)
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
                if(expanded) {
                    const list = this.generateHtmlList(node)
                    li.appendChild(list)
                    this.onExpanded(node)
                } else {
                    const list = li.querySelector('ul')!
                    li.removeChild(list)

                    const selectionSize = this.selectedForPurging.size
                    for(const c of node.children)
                        forEachInSubtree(c, w => {
                            this.data.delete(w)
                            this.selectedForPurging.delete(w)
                        })
                    if(this.selectedForPurging.size !== selectionSize)
                        this.selectionChanged(undefined)
                }
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
        selectableSpan.classList.add('selectable', 'cutview-node')
        if(node.cgOnly)
            selectableSpan.classList.add('cg-only')
        if(node.synthetic)
            selectableSpan.classList.add('synthetic')
        li.appendChild(selectableSpan)

        selectableSpan.addEventListener('mouseenter', async () => {
            if(this.selectedForPurging.has(node))
                return;

            if(this.onHover && this.onHover(d)) {
                selectableSpan.classList.add('hovered-for-purge')
            }
        })

        selectableSpan.addEventListener('mouseleave', async () => {
            selectableSpan.classList.remove('hovered-for-purge')

            if(this.selectedForPurging.has(node))
                return;

            if(this.onHover)
                this.onHover(undefined)
        })

        selectableSpan.addEventListener('click', () => {
            selectableSpan.classList.remove('hovered-for-purge')
            const selected = selectableSpan.classList.toggle('selected-for-purge')
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

    private increaseMaxPurgedSize(size: number) {
        if(this.maxPurgedSize && size <= this.maxPurgedSize)
            return
        this.maxPurgedSize = size

        for(const v of this.data.values()) {
            this.refreshPurgeSizeInCutOverview(v)
        }
    }

    private refreshPurgeSizeInCutOverview(cutData: NodeData) {
        const html = cutData.html

        const purged = this.selectedForPurging.size > 0
            ? cutData.reachableAfterAdditionallyCuttingThis
            : cutData.reachableAfterOnlyCuttingThis

        let text = null
        let width = '0'
        if(purged) {
            text = formatByteSizeWithUnitPrefix(purged)
            width = (purged / this.maxPurgedSize * 100) + '%'
        }
        html.querySelector<HTMLSpanElement>('.cut-size-column')!.textContent = text
        html.querySelector<HTMLDivElement>('.cut-size-bar')!.style.width = width
    }
}