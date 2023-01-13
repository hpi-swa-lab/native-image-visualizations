import Node from './Node'
import { NumberOfBytes } from '../types/utils'
import { UniverseCombination, UniverseName } from '../types/Universe'

export default interface MergedNodeWithSizes extends Omit<Node, 'children'> {
    sizes: Map<UniverseName, NumberOfBytes>
    exclusiveSizes: Map<UniverseCombination, NumberOfBytes>
    unionedSize: NumberOfBytes
    children: MergedNodeWithSizes[]
}
