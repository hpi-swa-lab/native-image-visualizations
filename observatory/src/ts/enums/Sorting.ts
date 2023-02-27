export enum SortingOption {
    NAME = 'name',
    SIZE = 'size'
}

export function sortingOptionForExport(option: SortingOption): string {
    return option.toString()
}

export enum SortingOrder {
    ASCENDING = 'ascending',
    DESCENDING = 'descending'
}

export function sortingOrderForExport(order: SortingOrder): string {
    return order.toString()
}
