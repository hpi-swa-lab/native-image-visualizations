import { Node } from './Node'
import { NumberOfBytes } from './NodeWithSize'
import { UniverseCombination, UniverseName } from './Universe'

export type MergedNodeWithSizes = Node & {
    sizes: Map<UniverseName, NumberOfBytes>
    exclusiveSizes: Map<UniverseCombination, NumberOfBytes>
    unionedSize: NumberOfBytes
    children: MergedNodeWithSizes[]
}
