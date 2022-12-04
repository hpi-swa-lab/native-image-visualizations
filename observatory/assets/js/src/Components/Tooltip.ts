import { removeChildren } from "../utils"

export default class Tooltip {
    title: string = ""
    datapoints: Record<string, any>
    id: number

    _container: HTMLDivElement
    _title: HTMLElement
    _dataContainer: HTMLElement

    constructor(title: string = "", datapoints: Record<string, any> = {}, visible: boolean = false) {
        this.title = title
        this.datapoints = datapoints

        this._build()
        this.buildContents()

        if (visible) {
            this.setVisible()
        } else {
            this.setInvisible()
        }
    }

    get widget(): HTMLElement {
        return this._container
    }

    _build() {
        this._container = this._buildContainer()

        this._title = this._buildTitle()
        this._dataContainer = this._buildDataContainer()

        this._container.appendChild(this._title)
        this._container.appendChild(this._dataContainer)
    }

    _buildContainer(): HTMLDivElement {
        const result = document.createElement("div")

        result.style.position = 'absolute'
        result.style.width = 'fit-content'
        result.style.zIndex = '999'
        result.style.background = '#ffffff'
        result.style.borderStyle = 'solid'
        result.style.borderWidth = '1px'
        result.style.borderColor = 'black'
        result.style.borderRadius = '5px'
        result.style.padding = '10px'
        result.style.boxShadow = '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)'

        return result
    }

    _buildTitle(): HTMLHeadingElement {
        return document.createElement("h4")
    }

    _buildDataContainer(): HTMLDivElement {
        const result = document.createElement("div")

        result.classList.add("d-flex", "flex-column")

        return result
    }

    buildContents(): void {
        this._title.innerHTML = this.title

        removeChildren(this._dataContainer)
        Object.keys(this.datapoints).forEach((name: string) => {
            const element = document.createElement("div")

            const title = document.createElement("p")
            title.innerHTML = name + ': '

            const data = document.createElement("p")
            data.innerHTML = this.datapoints[name]

            element.appendChild(title)
            element.appendChild(data)

            this._dataContainer.appendChild(element)
        })
    }

    setVisible() {
        this.widget.style.visibility = 'visible'
    }

    setInvisible() {
        this.widget.style.visibility = 'hidden'
    }

    moveToCoordinates(top: number, left: number) {
        this.widget.style.top = top + 'px'
        this.widget.style.left = left + 'px'
    }
}