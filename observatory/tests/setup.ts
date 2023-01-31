import { treeFactory, trees } from './data/trees'

beforeEach(() => {
    Object.assign(trees, treeFactory())
})
