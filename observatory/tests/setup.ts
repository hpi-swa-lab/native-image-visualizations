import { forestFactory, forest } from './data/forest'

beforeEach(() => {
    Object.assign(forest, forestFactory())
})
