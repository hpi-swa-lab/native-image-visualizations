import { Node } from '../UniverseTypes/Node'

export default interface Visualization {
    visualize(node: Node): void
}
