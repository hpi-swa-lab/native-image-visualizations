import { Visualization } from './Visualization'
import { Multiverse } from '../UniverseTypes/Multiverse'

export interface UniverseVisualization extends Visualization {
    setMultiverse(multiverse: Multiverse): void
}
