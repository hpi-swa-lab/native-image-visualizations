import { CausalityGraphConfig } from './causalityGraphStore'
import { GlobalConfig } from './globalStore'
import { SankeyStoreConfig } from './sankeyTreeStore'
import { TreeLineConfig } from './treeLineStore'
import { VennConfig } from './vennStore'

export type ExportConfig =
    | GlobalConfig
    | CausalityGraphConfig
    | SankeyStoreConfig
    | TreeLineConfig
    | VennConfig
