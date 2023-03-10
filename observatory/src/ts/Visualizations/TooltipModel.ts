export class TooltipModel {
    public content: string
    public show: boolean
    public x: number
    public y: number

    constructor(content = '', show = false, x = 0, y = 0) {
        this.content = content
        this.show = show
        this.x = x
        this.y = y
    }

    public display() {
        this.show = true
    }

    public updateContent(content: string) {
        this.content = content
    }

    public updatePosition(x: number, y: number) {
        this.x = x
        this.y = y
    }

    public hide() {
        this.show = false
    }
}
