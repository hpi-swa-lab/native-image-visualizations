interface String {
    isUpperCase(): boolean
}
String.prototype.isUpperCase = function () {
    return this == this.toUpperCase()
}

interface Number {
    // A function that makes sure a value is within a range. For example,
    // `2.clamp(0, 5)` returns 2 because 2 is between 0 and 5, but
    // `3.clamp(4, 6)` returns 4.
    clamp(min: number, max: number): number
}
Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max)
}

// From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
export function powerSet(l: string[]) {
    return (function ps(list): string[][] {
        if (list.length === 0) {
            return [[]]
        }
        var head = list.pop()
        var tailPS = ps(list)
        return tailPS.concat(
            tailPS.map(function (e) {
                return [head].concat(e)
            })
        )
    })(l.slice())
}

