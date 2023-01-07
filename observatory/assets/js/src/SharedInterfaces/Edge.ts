import VisualNode from './VisualNode'

export default interface Edge {
    source: VisualNode
    target: VisualNode
    weight: number
}
