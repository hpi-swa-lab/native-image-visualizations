import { Visualization } from './Visualization'
import { Universe } from '../UniverseTypes/Universe'

export interface UniverseVisualization extends Visualization {
    setUniverse(universe: Universe): void
}
