interface Number {
    // A function that makes sure a value is within a range. For example,
    // `2.clamp(0, 5)` returns 2 because 2 is between 0 and 5, but
    // `3.clamp(4, 6)` returns 4.
    clamp(min: number, max: number): number
}

interface String {
    isUpperCase(): boolean
}