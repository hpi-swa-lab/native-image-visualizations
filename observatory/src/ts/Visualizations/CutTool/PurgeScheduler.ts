import { ReachabilityHyperpathEdge, Unreachable } from '../../Causality/CausalityGraph'
import {
    collectCgNodesInSubtree,
    FullyHierarchicalNode
} from '../../UniverseTypes/CausalityGraphUniverse'
import {
    AsyncCausalityGraph,
    AsyncDetailedSimulationResult
} from '../../Causality/AsyncCausalityGraph'
import { BatchPurgeScheduler, PurgeResults } from './BatchPurgeScheduler'
import { assert } from '../../util/assert'

/*
 * It would be possible to directly invoke the causality querying backend.
 * In order to not starve the backend in enqueued work that is long-running, this scheduler is
 * employed.
 *
 * It prioritizes the requests, in the order
 * 1. Path-to request:
 *          Fastest operation with highest UI latency requirements
 * 2. Reachable-after-only-purging-this:
 *          Background operation, yet necessary for determining order of nodes
 * 3. Reachable-after-additionally-purging-this:
 *          Background operation, gets invalidated after selection change
 */

export class PurgeScheduler {
    detailSelectedCallback:
        | ((edges: ReachabilityHyperpathEdge[] | undefined, targetMid: number | undefined) => void)
        | undefined

    private _purgeSelectedNodes: FullyHierarchicalNode[] = []
    private _detailSelectedNode: FullyHierarchicalNode | undefined

    private selectedSimulationResult: AsyncDetailedSimulationResult | undefined
    private detailNeedsUpdate = false

    private cg: AsyncCausalityGraph
    private allReachable: PurgeResults

    private singleBatchScheduler: BatchPurgeScheduler
    private additionalBatchScheduler?: BatchPurgeScheduler

    private _additionalPurgeCallback?: (
        node: FullyHierarchicalNode | undefined,
        data: PurgeResults
    ) => void

    private processingRunning = false
    private _paused = true

    constructor(cg: AsyncCausalityGraph, allReachable: PurgeResults) {
        this.cg = cg
        this.allReachable = allReachable
        this.singleBatchScheduler = new BatchPurgeScheduler(cg)
    }

    set paused(val: boolean) {
        this._paused = val
        if (!val) this.ensureProcessing()
    }

    set singlePurgeCallback(
        callback: (node: FullyHierarchicalNode | undefined, data: PurgeResults) => void
    ) {
        this.singleBatchScheduler.callback = callback
    }

    set additionalPurgeCallback(
        callback: (node: FullyHierarchicalNode | undefined, data: PurgeResults) => void
    ) {
        this._additionalPurgeCallback = callback
        if (this.additionalBatchScheduler) this.additionalBatchScheduler.callback = callback
    }

    set purgeSelectedNodes(nodes: FullyHierarchicalNode[]) {
        this._purgeSelectedNodes = nodes
        if (this.selectedSimulationResult) {
            this.selectedSimulationResult.delete()
            this.selectedSimulationResult = undefined

            if (this._detailSelectedNode) this.detailNeedsUpdate = true
        }
        this.additionalBatchScheduler = undefined
        this.ensureProcessing()
    }

    set detailSelectedNode(v: FullyHierarchicalNode | undefined) {
        this._detailSelectedNode = v
        if (!this._detailSelectedNode) {
            if (this.detailSelectedCallback) this.detailSelectedCallback(undefined, undefined)
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
        if (this._purgeSelectedNodes.length === 0) return
        if (!this.additionalBatchScheduler) {
            this.additionalBatchScheduler = new BatchPurgeScheduler(
                this.cg,
                this._purgeSelectedNodes
            )
            this.additionalBatchScheduler.callback = this._additionalPurgeCallback
        }
        this.additionalBatchScheduler.request(v)
        this.ensureProcessing()
    }

    private async updateDetails(): Promise<boolean> {
        if (!this.detailNeedsUpdate) return false
        this.detailNeedsUpdate = false

        assert(this._detailSelectedNode !== undefined)
        if (!this.selectedSimulationResult) {
            const purgeMids = this._purgeSelectedNodes.flatMap((v) => [
                ...new Set(collectCgNodesInSubtree(v))
            ])
            this.selectedSimulationResult = await this.cg.simulatePurgeDetailed(purgeMids)
        }

        let mid = this._detailSelectedNode.cgNode

        const dists = await this.selectedSimulationResult.getReachableArray()

        if (mid === undefined) {
            // Take the cg node referenced in the subtree that first got reachable
            const mids = collectCgNodesInSubtree(this._detailSelectedNode)

            let bestDist = Unreachable
            for (const candidateMid of mids) {
                const candidateDist = dists[candidateMid]
                if (candidateDist < bestDist) {
                    bestDist = candidateDist
                    mid = candidateMid
                }
            }

            if (bestDist === Unreachable) {
                if (this.detailSelectedCallback) this.detailSelectedCallback([], undefined)
                return true
            }
            assert(mid !== undefined)
        } else if (dists[mid] === Unreachable) {
            if (this.detailSelectedCallback) this.detailSelectedCallback([], undefined)
            return true
        }

        const edges = await this.selectedSimulationResult.getReachabilityHyperpath(mid)
        if (this.detailSelectedCallback) this.detailSelectedCallback(edges, mid)
        return true
    }

    private async processIteration(): Promise<boolean> {
        return (
            (await this.updateDetails()) ||
            (await this.singleBatchScheduler.next()) ||
            (this.additionalBatchScheduler !== undefined &&
                (await this.additionalBatchScheduler.next()))
        )
    }

    private async doProcessing() {
        this.processingRunning = true
        try {
            while (!this._paused && (await this.processIteration())) {}
        } finally {
            this.processingRunning = false
        }
    }

    private ensureProcessing() {
        if (!this.processingRunning && !this._paused) this.doProcessing()
    }
}
