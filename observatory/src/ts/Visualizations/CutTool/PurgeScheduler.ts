import {ReachabilityHyperpathEdge} from '../../Causality/CausalityGraph';
import {collectCgNodesInSubtree, FullyHierarchicalNode} from '../../UniverseTypes/CausalityGraphUniverse';
import {AsyncCausalityGraph, AsyncDetailedSimulationResult} from '../../Causality/AsyncCausalityGraph';
import {BatchPurgeScheduler, ReachabilityVector} from './BatchPurgeScheduler';
import {assert} from '../../util/assert';

export class PurgeScheduler {
    detailSelectedCallback: ((edges: ReachabilityHyperpathEdge[] | undefined, targetMid: number | undefined) => void) | undefined

    private _purgeSelectedNodes: FullyHierarchicalNode[] = []
    private _detailSelectedNode: FullyHierarchicalNode | undefined

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
        if (this.selectedSimulationResult) {
            this.selectedSimulationResult.delete()
            this.selectedSimulationResult = undefined

            if (this._detailSelectedNode)
                this.detailNeedsUpdate = true
        }
        this.additionalBatchScheduler = undefined
        this.ensureProcessing()
    }

    set detailSelectedNode(v: FullyHierarchicalNode | undefined) {
        this._detailSelectedNode = v
        if (!this._detailSelectedNode) {
            if (this.detailSelectedCallback)
                this.detailSelectedCallback(undefined, undefined)
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

        assert(this._detailSelectedNode !== undefined)
        if (!this.selectedSimulationResult) {
            const purgeMids = this._purgeSelectedNodes
                .flatMap(v => [...new Set(collectCgNodesInSubtree(v))])
            this.selectedSimulationResult = await this.cg.simulatePurgeDetailed(purgeMids)
        }

        let mid = this._detailSelectedNode.cgNode

        if(mid === undefined) {
            // Take the cg node referenced in the subtree that first got reachable
            const mids = collectCgNodesInSubtree(this._detailSelectedNode)
            const dists = await this.selectedSimulationResult.getReachableArray()

            let bestDist = 0xFF // Not reachable
            for(const candidateMid of mids) {
                const candidateDist = dists[candidateMid]
                if(candidateDist < bestDist) {
                    bestDist = candidateDist
                    mid = candidateMid
                }
            }

            if(bestDist === 0xFF) {
                if(this.detailSelectedCallback)
                    this.detailSelectedCallback([], undefined)
                return true
            }
            assert(mid !== undefined)
        }

        const edges = await this.selectedSimulationResult
            .getReachabilityHyperpath(mid)
        if (this.detailSelectedCallback)
            this.detailSelectedCallback(edges, mid)
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