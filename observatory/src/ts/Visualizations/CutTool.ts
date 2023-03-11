import {
    CausalityGraphUniverse,
    collectCgNodesInSubtree,
    forEachInSubtree,
    FullyHierarchicalNode
} from '../UniverseTypes/CausalityGraphUniverse';
import {toRaw} from 'vue';
import {CutView} from './CutTool/CutView';
import {ImageView} from './CutTool/ImageView';
import {DetailView} from './CutTool/DetailView'
import {ReachabilityVector} from './CutTool/BatchPurgeScheduler';
import {PurgeScheduler} from './CutTool/PurgeScheduler';
import {AsyncCausalityGraph} from '../Causality/AsyncCausalityGraph';


export class CutTool {
    readonly domRoot: HTMLDivElement
    readonly ps: PurgeScheduler
    readonly cg: AsyncCausalityGraph
    readonly cutview: CutView
    readonly imageview: ImageView
    readonly detailview: DetailView

    readonly dataRoot: FullyHierarchicalNode

    readonly allReachable: Uint8Array

    readonly singleSimulationResultCache = new Map<FullyHierarchicalNode, ReachabilityVector>()
    readonly additionalSimulationResultCache = new Map<FullyHierarchicalNode, ReachabilityVector>()

    constructor(domRoot: HTMLDivElement,
                universe: CausalityGraphUniverse,
                cg: AsyncCausalityGraph,
                allReachable: Uint8Array) {
        this.domRoot = domRoot
        this.dataRoot = universe.causalityRoot
        this.cg = cg
        this.allReachable = allReachable

        this.ps = new PurgeScheduler(cg, universe.codesizeByCgNodeLabels, allReachable)
        this.ps.detailSelectedCallback = (edges, targetMid) => this.detailview.renderGraphOnDetailView(edges, targetMid)

        this.ps.singlePurgeCallback = (v, data) => {
            this.singleSimulationResultCache.set(v, data)
            this.cutview.setSinglePurgeData(v, data.size)
        }
        this.ps.additionalPurgeCallback = (v, data) => {
            this.additionalSimulationResultCache.set(v, data)
            this.cutview.setAdditionalPurgeData(v, data.size)
        }

        this.cutview = new CutView(
            v => this.cutView_onExpanded(v),
            v => this.cutView_onSelectionChanged(v),
            v => this.cutView_onHover(v))

        this.cutview.populate(
            domRoot.querySelector('#cut-overview-root')!,
            universe.causalityRoot)

        this.imageview = new ImageView(
            allReachable,
            universe.causalityRoot,
            universe.codesizeByCgNodeLabels,
            Math.max(...this.dataRoot.children.map(d => d.size)),
            (v) => this.ps.detailSelectedNode = v)

        this.imageview.populate(
            domRoot.querySelector('#imageview-root')!)

        this.detailview = new DetailView(
            domRoot.querySelector('#detail-div')!,
            universe.cgNodeLabels,
            universe.cgTypeLabels)


        let mainMethod: FullyHierarchicalNode | undefined
        forEachInSubtree(this.dataRoot, v => {
            if(v.main)
                mainMethod = v
        })
        if(mainMethod)
            this.cutview.expandTo(mainMethod)

        this.ps.paused = false
    }

    public static async create(domRoot: HTMLDivElement, universe: CausalityGraphUniverse) {
        domRoot.querySelector<HTMLDivElement>('#main-panel')!.hidden = true
        domRoot.querySelector<HTMLDivElement>('#loading-panel')!.hidden = false
        const universeRaw = toRaw(universe)
        const cg = await universeRaw.getCausalityGraph()
        const allReachable = await cg.simulatePurge()
        domRoot.querySelector<HTMLDivElement>('#loading-panel')!.hidden = true
        domRoot.querySelector<HTMLDivElement>('#main-panel')!.hidden = false
        return new CutTool(domRoot, universeRaw, cg, allReachable)
    }

    public dispose() {
        this.domRoot.querySelector('#imageview-root')!.textContent = ''
        this.domRoot.querySelector('#cut-overview-root')!.textContent = ''
        this.domRoot.querySelector<HTMLDivElement>('#main-panel')!.hidden = true
    }

    private cutView_onExpanded(v: FullyHierarchicalNode) {
        for(const w of v.children) {
            const cachedResult = this.singleSimulationResultCache.get(w)
            if(cachedResult)
                this.cutview.setSinglePurgeData(w, cachedResult.size)
        }
        this.ps.requestSinglePurgeInfo(
            v.children.filter(w => !this.singleSimulationResultCache.has(w)))

        if (this.cutview.selectedForPurging.size > 0) {
            let containedInSelection = false
            for (const u of [...this.cutview.selectedForPurging]) {
                forEachInSubtree(u, w => {
                    if (w === v)
                        containedInSelection = true
                })
            }

            if (!containedInSelection) {
                for(const w of v.children) {
                    const cachedResult = this.additionalSimulationResultCache.get(w)
                    if(cachedResult)
                        this.cutview.setAdditionalPurgeData(w, cachedResult.size)
                }
                this.ps.requestAdditionalPurgeInfo(
                    v.children.filter(w => !this.additionalSimulationResultCache.has(w)))
            }
        }
    }


    private async cutView_onSelectionChanged(v: FullyHierarchicalNode | undefined) {
        this.ps.purgeSelectedNodes = [...this.cutview.selectedForPurging]

        let stillReachable

        if (v !== undefined) {
            const cache = this.cutview.selectedForPurging.size === 1
                ? this.singleSimulationResultCache
                : this.additionalSimulationResultCache;
            const data = cache.get(v)
            if (data)
                stillReachable = data.arr
        } else if (this.cutview.selectedForPurging.size === 0) {
            stillReachable = this.allReachable
        }

        if (!stillReachable) {
            // We have to simulate
            const purgeSet =
                [...new Set([...this.cutview.selectedForPurging].flatMap(collectCgNodesInSubtree))]
            stillReachable = await this.cg.simulatePurge(purgeSet)
        }

        this.additionalSimulationResultCache.clear()
        for (const v of this.cutview.visibleNodes)
            this.cutview.setAdditionalPurgeData(v, undefined)

        if (this.cutview.selectedForPurging.size > 0)
            this.ps.requestAdditionalPurgeInfo(Array.from(this.cutview.visibleNodes))

        this.imageview.updateReachableSets(stillReachable, stillReachable)
    }

    // Returns whether the hovering effect should be shown
    private cutView_onHover(v: FullyHierarchicalNode | undefined): boolean {
        let reachableOnHover: Uint8Array | undefined | null
        if (v) {
            const cache = this.cutview.selectedForPurging.size === 0
                ? this.singleSimulationResultCache
                : this.additionalSimulationResultCache;
            reachableOnHover = cache.get(v)?.arr
        } else {
            reachableOnHover = null // Explicit command to reset the hover set
        }

        if(reachableOnHover !== undefined)
            this.imageview.updateReachableSets(undefined, reachableOnHover)
        return reachableOnHover !== undefined
    }
}