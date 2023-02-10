export interface VennPartitions {
    inclusive: VennSet[]
    exclusive: VennSet[]
}

export interface VennSet {
    sets: string[]
    size: number
}
