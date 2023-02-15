// A function that makes sure a value is within a range. For example,
// `2.clamp(0, 5)` returns 2 because 2 is between 0 and 5, but `3.clamp(4, 6)`
// returns 4.
export function clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max)
}

// From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
export function powerSet<T>(l: T[]) {
    return (function ps(list): T[][] {
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

/// Lightens up a color by moving it closer to white.
export function lightenColor(color: string, alpha: number): string {
    let r = parseInt(color.substring(1, 3), 16)
    let g = parseInt(color.substring(3, 5), 16)
    let b = parseInt(color.substring(5, 7), 16)

    const rr = Math.round(r * alpha + 255 * (1 - alpha))
    const gg = Math.round(g * alpha + 255 * (1 - alpha))
    const bb = Math.round(b * alpha + 255 * (1 - alpha))

    const rrr = rr.toString(16).length === 1 ? `0${rr.toString(16)}` : rr.toString(16)
    const ggg = gg.toString(16).length === 1 ? `0${gg.toString(16)}` : gg.toString(16)
    const bbb = bb.toString(16).length === 1 ? `0${bb.toString(16)}` : bb.toString(16)

    return `#${rrr}${ggg}${bbb}`
}
