export enum SortingOption {
    NAME = 'name',
    SIZE = 'size'
}

export namespace SortingOption {
    export function getName(): string {
        return 'sorting-option';
    }
}


export enum SortingOrder {
    ASCENDING = 'ascending',
    DESCENDING = 'descending'
}

export namespace SortingOrder {
    export function getName(): string {
        return 'sorting-order';
    }
}