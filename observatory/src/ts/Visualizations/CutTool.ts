import {RemoteCausalityGraph} from '../Causality/RemoteCausalityGraph';
import {Remote} from 'comlink';
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
import {PurgeScheduler} from './PurgeScheduler';


export class CutTool {
    domRoot: HTMLDivElement
    ps: PurgeScheduler
    cg: Remote<RemoteCausalityGraph>
    cutview: CutView
    imageview: ImageView
    detailview: DetailView

    methodList: string[]
    typeList: string[]
    dataRoot: FullyHierarchicalNode

    readonly singleSimulationResultCache = new Map<FullyHierarchicalNode, ReachabilityVector>()
    readonly additionalSimulationResultCache = new Map<FullyHierarchicalNode, ReachabilityVector>()

    constructor(domRoot: HTMLDivElement, universe: CausalityGraphUniverse, cg: any, allReachable: Uint8Array) {
        this.domRoot = domRoot

        this.methodList = universe.cgNodeLabels
        this.typeList = universe.cgTypeLabels
        this.dataRoot = universe.causalityRoot

        this.cutview = new CutView(domRoot.querySelector('#cut-overview-root')!, universe.causalityRoot)
        this.imageview = new ImageView(domRoot.querySelector('#imageview-root')!, universe.causalityRoot, allReachable, universe.codesizeByCgNodeLabels, Math.max(...this.dataRoot.children.map(d => d.size)))
        this.detailview = new DetailView(domRoot.querySelector('#detail-div')!, this.methodList, this.typeList)

        this.cg = cg
        this.imageview.reachable_in_image_view = this.imageview.reachable_under_selection = this.imageview.all_reachable = allReachable
        this.imageview.selectedNodeChange = (v) => this.ps.detailSelectedMid = v?.exact_cg_node
        this.ps = new PurgeScheduler(cg, universe.codesizeByCgNodeLabels, allReachable)
        this.ps.detailSelectedCallback = edges => this.detailview.renderGraphOnDetailView(edges)

        this.ps.singlePurgeCallback = (v, data) => {
            this.singleSimulationResultCache.set(v, data)
            this.cutview.setSinglePurgeData(v, data.size)
        }
        this.ps.additionalPurgeCallback = (v, data) => {
            this.additionalSimulationResultCache.set(v, data)
            this.cutview.setAdditionalPurgeData(v, data.size)
        }

        this.cutview.onHover = (v) => {
            let changed
            if(v) {
                const maybe_reachable_in_image_view = this.cutview.selectedForPurging.size === 0 ? this.singleSimulationResultCache.get(v) : this.additionalSimulationResultCache.get(v)
                changed = maybe_reachable_in_image_view !== undefined
                if (maybe_reachable_in_image_view)
                    this.imageview.reachable_in_image_view = maybe_reachable_in_image_view.arr
            } else {
                changed = this.imageview.reachable_in_image_view !== this.imageview.reachable_under_selection
                this.imageview.reachable_in_image_view = this.imageview.reachable_under_selection
            }

            if (changed)
                this.imageview.updatePurgeValues(this.dataRoot)
            return changed
        }

        this.cutview.onExpanded = (v) => {
            this.ps.requestSinglePurgeInfo(v.children)

            if (this.cutview.precomputeCutoffs && this.cutview.selectedForPurging.size > 0) {
                let containedInSelection = false
                for (const u of [...this.cutview.selectedForPurging]) {
                    forEachInSubtree(u, w => {
                        if(w === v)
                            containedInSelection = true
                    })
                }

                if(!containedInSelection) {
                    this.ps.requestAdditionalPurgeInfo(v.children)
                }
            }
        }

        this.cutview.selectionChanged = async (v) => {
            this.ps.purgeSelectedMids = [...this.cutview.selectedForPurging]

            let stillReachable

            if(v !== undefined) {
                const cache = this.cutview.selectedForPurging.size === 1 ? this.singleSimulationResultCache : this.additionalSimulationResultCache;
                const data = cache.get(v)
                if(data)
                    stillReachable = data.arr
            } else if(this.cutview.selectedForPurging.size === 0) {
                stillReachable = allReachable
            }

            if(!stillReachable) {
                // We have to simulate
                const purgeSet = [...new Set([...this.cutview.selectedForPurging].flatMap(collectCgNodesInSubtree))]
                stillReachable = await this.cg.simulatePurge(purgeSet)
            }

            this.imageview.reachable_under_selection = stillReachable
            this.imageview.reachable_in_image_view = stillReachable

            this.additionalSimulationResultCache.clear()
            for(const v of this.cutview.cutviewData.keys())
                this.cutview.setAdditionalPurgeData(v, undefined)

            if(this.cutview.precomputeCutoffs && this.cutview.selectedForPurging.size > 0) {
                this.ps.requestAdditionalPurgeInfo(Array.from(this.cutview.cutviewData.keys()))
            }
            this.imageview.updatePurgeValues(this.dataRoot)
        }

        let mainMethod: FullyHierarchicalNode | undefined
        forEachInSubtree(this.dataRoot, v => {
            if(v.main)
                mainMethod = v
        })

        if(mainMethod) {
            this.cutview.expandTo(mainMethod)
        }

        this.ps.requestSinglePurgeInfo([...this.cutview.cutviewData.keys()])
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

    public changePrecomputeCutoffs(enable: boolean) {
        this.cutview.precomputeCutoffs = enable
    }
}