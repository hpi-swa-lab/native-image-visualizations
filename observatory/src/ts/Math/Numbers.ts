// A function that makes sure a value is within a range. For example,
// `clamp(2, 0, 5)` returns 2 because 2 is between 0 and 5, but `clamp(3, 4, 6)`
// returns 4 – the 3 is moved into the range [4, 6].
export function clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max)
}
