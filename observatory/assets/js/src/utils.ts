import { Color } from "d3"

export function randomColor(): string {
    let color = '#'

    for (let i = 0; i < 3; i++) {
        const sub = Math.floor(Math.random() * 256).toString(16)
        color += sub.length == 1 ? '0' + sub : sub
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
    while(widget.firstChild) {
        widget.removeChild(widget.lastChild)
    }
}
