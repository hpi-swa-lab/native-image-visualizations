import { Visualization } from './Visualization'
import { Multiverse } from '../UniverseTypes/Multiverse'

export interface MultiverseVisualization extends Visualization {
    setMultiverse(multiverse: Multiverse): void
}
