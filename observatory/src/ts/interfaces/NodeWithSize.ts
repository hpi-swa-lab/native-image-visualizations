import Node from './Node'
import { NumberOfBytes } from '../types/utils'

export default interface NodeWithSize extends Omit<Node, 'children'> {
    size: NumberOfBytes
    children: NodeWithSize[]
}
