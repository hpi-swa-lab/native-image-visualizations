import { treeFactory, forest } from './data/forest'

beforeEach(() => {
    Object.assign(forest, treeFactory())
})
