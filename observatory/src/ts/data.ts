/// The base node that can represent all the packages, classes, and methods in
/// an image.
export type Node = {
    name: string
    type: NodeType
    children: Node[]
}
export enum NodeType {
    Package,
    Class,
    Method
}

export type NodeWithSize = Node & {
    size: NumberOfBytes
    children: NodeWithSize[]
}
export type NumberOfBytes = number

/// When working with multiple universes (native image builds), they are each
/// identified using a string. That name is guaranteed to not contain a comma.
export type UniverseName = string

/// When diffing universes, we have to work with intersections of several
/// universes. Currently, those are represented using a single string,
/// containing comma-separated universe names. For example, "helloworld",
/// "micronaut", and "helloworld,micronaut" are all universe combinations.
export type UniverseCombination = string
export function combinationFromNames(universes: UniverseName[]): UniverseCombination {
    universes.sort()
    return universes.join(',')
}

/// A node that is the result of merging multiple universes.
export type MergedNodeWithSizes = Node & {
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

