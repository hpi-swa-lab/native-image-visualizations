import {ReachabilityHyperpathEdge} from '../Causality/CausalityGraph';
import {collectCgNodesInSubtree, FullyHierarchicalNode} from '../UniverseTypes/CausalityGraphUniverse';
import {AsyncCausalityGraph, AsyncDetailedSimulationResult} from '../Causality/AsyncCausalityGraph';
import {BatchPurgeScheduler, ReachabilityVector} from './CutTool/BatchPurgeScheduler';
import {assert} from '../util/assert';

export class PurgeScheduler {
    detailSelectedCallback: ((edges: ReachabilityHyperpathEdge[] | undefined) => void) | undefined

    private _purgeSelectedMids: FullyHierarchicalNode[] = []
    private _detailSelectedMid: number | undefined

    private selectedSimulationResult: AsyncDetailedSimulationResult | undefined
    private detailNeedsUpdate = false

    private cg: AsyncCausalityGraph
    private codesizes: number[]
    private all_reachable: Uint8Array

    private singleBatchScheduler: BatchPurgeScheduler
    private additionalBatchScheduler?: BatchPurgeScheduler

    private _additionalPurgeCallback?: (node: FullyHierarchicalNode, data: ReachabilityVector) => void

    private processingRunning = false

    constructor(cg: AsyncCausalityGraph, codesizes: number[], all_reachable: Uint8Array) {
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

    set singlePurgeCallback(callback: (node: FullyHierarchicalNode, data: ReachabilityVector) => void) {
        this.singleBatchScheduler.callback = callback
    }

    set additionalPurgeCallback(callback: (node: FullyHierarchicalNode, data: ReachabilityVector) => void) {
        this._additionalPurgeCallback = callback
        if (this.additionalBatchScheduler)
            this.additionalBatchScheduler.callback = callback
    }

    set purgeSelectedMids(nodes: FullyHierarchicalNode[]) {
        this._purgeSelectedMids = nodes
        if (this._detailSelectedMid) {
            if (this.selectedSimulationResult) {
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
        if (!mid) {
            if (this.detailSelectedCallback)
                this.detailSelectedCallback(undefined)
        } else {
            this.detailNeedsUpdate = true
            this.ensureProcessing()
        }
    }

    requestSinglePurgeInfo(v: FullyHierarchicalNode[]) {
        this.singleBatchScheduler.request(v)
        this.ensureProcessing()
    }

    async requestAdditionalPurgeInfo(v: FullyHierarchicalNode[]) {
        if (this._purgeSelectedMids.length === 0)
            return
        if (!this.additionalBatchScheduler) {
            this.additionalBatchScheduler = new BatchPurgeScheduler(this.cg, this.codesizes, undefined, this._purgeSelectedMids)
            this.additionalBatchScheduler.callback = this._additionalPurgeCallback
        }
        this.additionalBatchScheduler.request(v)
        this.ensureProcessing()
    }

    private async doProcessing() {
        this.processingRunning = true
        try {
            while (true) {
                if (this.detailNeedsUpdate) {
                    assert(this._detailSelectedMid !== undefined)
                    if (!this.selectedSimulationResult)
                        this.selectedSimulationResult = await this.cg.simulatePurgeDetailed(this._purgeSelectedMids.flatMap(v => [...new Set(collectCgNodesInSubtree(v))]))
                    const edges = await this.selectedSimulationResult.getReachabilityHyperpath(this._detailSelectedMid)
                    if (this.detailSelectedCallback)
                        this.detailSelectedCallback(edges)
                    this.detailNeedsUpdate = false
                } else if (await this.singleBatchScheduler.next()) {
                } else if (this.additionalBatchScheduler && await this.additionalBatchScheduler.next()) {
                } else {
                    break
                }
            }
        } finally {
            this.processingRunning = false
        }
    }

    private ensureProcessing() {
        if (!this.processingRunning)
            this.doProcessing()
    }
}