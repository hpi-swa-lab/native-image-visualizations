import {ReachabilityHyperpathEdge} from '../../Causality/CausalityGraph';
import {collectCgNodesInSubtree, FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {AsyncCausalityGraph, AsyncDetailedSimulationResult} from '../../Causality/AsyncCausalityGraph';
import {BatchPurgeScheduler, ReachabilityVector} from './BatchPurgeScheduler';
import {assert} from '../../util/assert';

export class PurgeScheduler {
    detailSelectedCallback: ((edges: ReachabilityHyperpathEdge[] | undefined) => void) | undefined

    private _purgeSelectedNodes: FullyHierarchicalNode[] = []
    private _detailSelectedCgNode: number | undefined

    private selectedSimulationResult: AsyncDetailedSimulationResult | undefined
    private detailNeedsUpdate = false

    private cg: AsyncCausalityGraph
    private codesizes: number[]
    private allReachable: Uint8Array

    private singleBatchScheduler: BatchPurgeScheduler
    private additionalBatchScheduler?: BatchPurgeScheduler

    private _additionalPurgeCallback?:
        (node: FullyHierarchicalNode, data: ReachabilityVector) => void

    private processingRunning = false
    private _paused = true

    constructor(cg: AsyncCausalityGraph, codesizes: number[], allReachable: Uint8Array) {
        this.cg = cg
        this.codesizes = codesizes
        this.allReachable = allReachable

        let baseline = 0
        for (let i = 0; i < this.codesizes.length; i++)
            if (allReachable[i] === 0xFF)
                baseline += this.codesizes[i]
        this.singleBatchScheduler = new BatchPurgeScheduler(cg, codesizes, baseline)
    }

    set paused(val: boolean) {
        this._paused = val
        if(!val)
            this.ensureProcessing()
    }

    set singlePurgeCallback(
        callback: (node: FullyHierarchicalNode, data: ReachabilityVector) => void) {
        this.singleBatchScheduler.callback = callback
    }

    set additionalPurgeCallback(
        callback: (node: FullyHierarchicalNode, data: ReachabilityVector) => void) {
        this._additionalPurgeCallback = callback
        if (this.additionalBatchScheduler)
            this.additionalBatchScheduler.callback = callback
    }

    set purgeSelectedNodes(nodes: FullyHierarchicalNode[]) {
        this._purgeSelectedNodes = nodes
        if (this._detailSelectedCgNode) {
            if (this.selectedSimulationResult) {
                this.selectedSimulationResult.delete()
                this.selectedSimulationResult = undefined
            }
            this.detailNeedsUpdate = true
        }
        this.additionalBatchScheduler = undefined
        this.ensureProcessing()
    }

    set detailSelectedNode(v: FullyHierarchicalNode | undefined) {
        this._detailSelectedCgNode = v?.cgNode
        if (!this._detailSelectedCgNode) {
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
        if (this._purgeSelectedNodes.length === 0)
            return
        if (!this.additionalBatchScheduler) {
            this.additionalBatchScheduler = new BatchPurgeScheduler(
                this.cg, this.codesizes,
                undefined,
                this._purgeSelectedNodes)
            this.additionalBatchScheduler.callback = this._additionalPurgeCallback
        }
        this.additionalBatchScheduler.request(v)
        this.ensureProcessing()
    }

    private async updateDetails(): Promise<boolean> {
        if(!this.detailNeedsUpdate)
            return false
        this.detailNeedsUpdate = false

        assert(this._detailSelectedCgNode !== undefined)
        if (!this.selectedSimulationResult) {
            const purgeMids = this._purgeSelectedNodes
                .flatMap(v => [...new Set(collectCgNodesInSubtree(v))])
            this.selectedSimulationResult = await this.cg.simulatePurgeDetailed(purgeMids)
        }
        const edges = await this.selectedSimulationResult
            .getReachabilityHyperpath(this._detailSelectedCgNode)
        if (this.detailSelectedCallback)
            this.detailSelectedCallback(edges)
        return true
    }

    private async processIteration(): Promise<boolean> {
        return await this.updateDetails()
            || await this.singleBatchScheduler.next()
            || (this.additionalBatchScheduler !== undefined
                && await this.additionalBatchScheduler.next())
    }

    private async doProcessing() {
        this.processingRunning = true
        try {
            while (!this._paused && await this.processIteration()) {}
        } finally {
            this.processingRunning = false
        }
    }

    private ensureProcessing() {
        if (!this.processingRunning && !this._paused)
            this.doProcessing()
    }
}