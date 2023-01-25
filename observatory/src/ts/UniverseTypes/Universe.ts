import { MegaBytes } from '../SharedTypes/Size'

export interface Universe {
    identifier(): string
    isInline(): boolean
    get universes(): Universe[]
    get parent(): Universe | undefined
    get name(): string
    get codeSize(): MegaBytes
}
