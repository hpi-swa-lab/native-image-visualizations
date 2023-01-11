import Node from './Node'
import { NumberOfBytes } from '../SharedTypes/utils'

export default interface NodeWithSize extends Omit<Node, 'children'> {
    size: NumberOfBytes
    children: NodeWithSize[]
}
