import Node from './Node'
import { NumberOfBytes } from '../SharedTypes/utils'
import { UniverseCombination, UniverseName } from '../SharedTypes/Universe'

export default interface MergedNodeWithSizes extends Omit<Node, 'children'> {
    sizes: Map<UniverseName, NumberOfBytes>
    exclusiveSizes: Map<UniverseCombination, NumberOfBytes>
    unionedSize: NumberOfBytes
    children: MergedNodeWithSizes[]
}
