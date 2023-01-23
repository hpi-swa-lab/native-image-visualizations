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

export function deepCopy(obj: any): any {
    return JSON.parse(JSON.stringify(obj))
}

export function randomColor(): string {
    let color = '#'

    for (let i = 0; i < 3; i++) {
        const sub = Math.floor(Math.random() * 256).toString(16)
        color += sub.length == 1 ? `0${sub}` : sub
    }

    return color
}

export function uniqueColor(existingColors: string[]): string {
    let generatedColor = randomColor()

    while (existingColors.includes(generatedColor)) {
        generatedColor = randomColor()
    }

    return generatedColor
}

export function randomInteger(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)

    return Math.floor(Math.random() * (max - min) + min)
}

export function removeChildren(widget: HTMLElement) {
    while (widget.lastChild) {
        widget.removeChild(widget.lastChild)
    }
}
