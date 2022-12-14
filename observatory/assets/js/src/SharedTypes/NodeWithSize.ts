import { Node } from './Node'

export type NodeWithSize = Node & {
    size: NumberOfBytes
    children: NodeWithSize[]
}

export type NumberOfBytes = number
