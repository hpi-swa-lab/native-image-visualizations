import { removeChildren } from "../utils"

export default class Tooltip {
    _title: string = ""
    _datapoints: Record<string, any>

    _container: HTMLDivElement
    _titleElement: HTMLElement
    _dataElement: HTMLElement

    constructor(title: string = "", datapoints: Record<string, any> = {}, visible: boolean = false) {
        this._build()
        
        this.title = title
        this.datapoints = datapoints

        if (visible) {
            this.setVisible()
        } else {
            this.setInvisible()
        }
    }

    get widget(): HTMLElement {
        return this._container
    }

    get title() {
        return this._title
    }

    set title(newValue: string) {
        this._title = newValue
        this._buildTitleContent()
    }

    get datapoints() {
        return this._datapoints
    }

    set datapoints(newValues: Record<string, any>) {
        this._datapoints = newValues
        this._buildDataContainerContent()
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


    _build() {
        this._container = this._buildContainer()

        this._titleElement = this._buildTitle()
        this._dataElement = this._buildDataContainer()

        this._container.appendChild(this._titleElement)
        this._container.appendChild(this._dataElement)
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

    _buildTitleContent() {
        this._titleElement.innerHTML = this.title
    }

    _buildDataContainerContent() {
        removeChildren(this._dataElement)
        Object.keys(this.datapoints).forEach((name: string) => {
            const element = document.createElement("div")

            const title = document.createElement("p")
            title.innerHTML = name + ': '

            const data = document.createElement("p")
            data.innerHTML = this.datapoints[name]

            element.appendChild(title)
            element.appendChild(data)

            this._dataElement.appendChild(element)
        })
    }
}