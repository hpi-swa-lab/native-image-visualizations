import { Universe } from '../UniverseTypes/Universe'

export default interface Visualization {
    visualize(universe: Universe): void
}
