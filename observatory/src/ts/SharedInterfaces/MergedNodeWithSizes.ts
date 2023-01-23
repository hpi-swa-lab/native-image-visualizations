import { UniverseCombination, UniverseName } from '../SharedTypes/Universe'
import { NumberOfBytes } from '../SharedTypes/utils'
import Node from './Node'

/// A node that is the result of merging multiple universes.
export default interface MergedNodeWithSizes extends Omit<Node, 'children'> {
    /// The individual sizes of the trees from the respective universes. For
    /// example, when merging "helloworld" and "micronaut", this contains both
    /// the size of this subtree in the "helloworld" universe as well as in the
    /// the "micronaut" universe.
    sizes: Map<UniverseName, NumberOfBytes>

    /// The sizes exclusive to particular combinations. For example, when
    /// merging "helloworld" and "micronaut", this will contain sizes for
    /// "helloworld", "micronaut", and "helloworld,micronaut". The sizes
    /// correspond to the code only contained in "helloworld", the code only
    /// contained in "micronaut", and the code contained in both "helloworld"
    /// and "micronaut".
    exclusiveSizes: Map<UniverseCombination, NumberOfBytes>

    /// The unioned size of this node over all universes. This is equal to the
    /// sum of all exclusive sizes.
    unionedSize: NumberOfBytes

    children: MergedNodeWithSizes[]
}
