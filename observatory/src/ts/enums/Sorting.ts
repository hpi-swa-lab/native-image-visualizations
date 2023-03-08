export enum SortingOption {
    NAME = 'name',
    SIZE = 'size'
}

export function serializeSortingOption(option: SortingOption): string {
    return option.toString()
}

export enum SortingOrder {
    NONE = 'none',
    ASCENDING = 'ascending',
    DESCENDING = 'descending'
}

export function serializeSortingOrder(order: SortingOrder): string {
    return order.toString()
}

export function deserializeSortingOrder(orderName: string): SortingOrder | undefined {
    return Object.values(SortingOrder).find((order) => order === orderName)
}
