import { COLOR_MODIFIED, COLOR_UNMODIFIED, MODIFIED, UNMODIFIED } from './TreeConstants'
import {
    CheckInputRole,
    CheckInputType,
    Dictionary,
    SortingOption,
    SortingOrder,
    TreeNodesFilter,
    UniverseProps
} from './TreeTypes'

export default class TreeInputForm {
    element: HTMLFormElement

    constructor(universesMetadata: Dictionary<UniverseProps>, filter: TreeNodesFilter) {
        const div = document.createElement('div')
        div.classList.add('input-container', 'settings-container', 'p-3')

        const form = document.createElement('form')
        form.setAttribute('id', 'tree-settings-form')
        // form.classList.add('border', 'rounded')

        const title = document.createElement('h3')
        title.innerText = 'Settings'

        form.appendChild(title)

        form.appendChild(this.createFieldsetDiffingFilter(universesMetadata, filter))
        form.appendChild(this.createFieldsetSorting(filter))
        // form.appendChild(this.createFieldsetDetailsSlider())
        // form.appendChild(this.createFieldsetMethodsFilter())

        form.appendChild(this.createSubmitButton())
        form.appendChild(this.createExpandTreeButton())

        form.appendChild(this.createShortcutText())

        div.appendChild(form)
        document.body.appendChild(div)
        this.element = form
    }

    private createFieldsetDiffingFilter(
        universesMetadata: Dictionary<UniverseProps>,
        filter: TreeNodesFilter
    ) {
        const fieldset = this.createFieldsetWithLegend('diffingFilter', 'Display Universes...')
        const keys = Object.keys(universesMetadata)
        const filteredKeys = keys.filter((key) => key.length == 1)

        // add checkboxes & labels
        filteredKeys.forEach((key) => {
            const div = this.createCheckboxLabelDiv(
                key,
                universesMetadata[key].name,
                universesMetadata[key].color.toString(),
                filter.diffing.universes.has(key)
            )
            fieldset.appendChild(div)
        })
        fieldset.appendChild(
            this.createCheckboxLabelDiv(
                UNMODIFIED,
                'unmodified packages',
                COLOR_UNMODIFIED.toString(),
                filter.diffing.universes.has(UNMODIFIED)
            )
        )
        fieldset.appendChild(
            this.createLabelDiv(MODIFIED, 'modified packages', COLOR_MODIFIED.toString())
        )

        return fieldset
    }

    private createFieldsetSorting(filter: TreeNodesFilter) {
        const fieldset = this.createFieldsetWithLegend('sortingFilter', 'Sort nodes by ...')

        const divRow = this.createDiv(['row'])
        divRow.appendChild(
            this.createRadioGroupDiv(
                Object.values(SortingOption),
                'sorting-option',
                filter.sorting.option,
                ['col-sm-3']
            )
        )
        divRow.appendChild(
            this.createRadioGroupDiv(
                Object.values(SortingOrder),
                'sorting-order',
                filter.sorting.order,
                ['col-sm-3']
            )
        )
        fieldset.appendChild(divRow)

        return fieldset
    }

    private createFieldsetDetailsSlider() {
        const fieldset = this.createFieldsetWithLegend('detailsFilter', 'WIP - Details Slider')
        return fieldset
    }

    private createFieldsetMethodsFilter() {
        const fieldset = this.createFieldsetWithLegend('methodsFilter', 'WIP - Methods Filter')
        return fieldset
    }

    private createShortcutText() {
        const div = this.createDiv(['alert', 'alert-info', 'mt-3'])
        div.setAttribute('role', 'alert')

        const title = document.createElement('h4')
        title.innerText = 'Shortcuts'

        const ul = document.createElement('ul')
        ul.classList.add('list-unstyled')
        const items = ['shift+click on node expands branch']
        for (const item of items) {
            const li = document.createElement('li')
            li.innerText = item
            ul.appendChild(li)
        }

        div.appendChild(title)
        div.appendChild(ul)
        return div
    }

    private createSubmitButton() {
        const submitBtn = document.createElement('button')
        submitBtn.setAttribute('type', 'submit')
        submitBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'm-2')
        submitBtn.innerText = 'update tree'
        return submitBtn
    }

    private createExpandTreeButton() {
        const btn = document.createElement('button')
        btn.setAttribute('type', 'button')
        btn.setAttribute('id', 'expand-tree-btn')
        btn.classList.add('btn', 'btn-sm', 'btn-light', 'm-2')
        btn.innerText = 'expand full tree'
        return btn
    }

    // ##########################################################################################################
    // ##### CREATE HTML ########################################################################################
    // ##########################################################################################################

    private createFieldsetWithLegend(id: string, legendText: string) {
        const fieldset = document.createElement('fieldset')
        fieldset.setAttribute('id', id)
        fieldset.classList.add('border', 'p-2', 'w-auto')
        const legend = document.createElement('legend')
        legend.classList.add('w-auto', 'float-none', 'p-2', 'fs-5')
        legend.innerText = legendText
        fieldset.appendChild(legend)
        return fieldset
    }

    private createCheckboxLabelDiv(
        id: string,
        label: string,
        backgroundColor: string,
        checked: boolean
    ) {
        const div = this.createDiv(['form-check', 'form-switch'], backgroundColor)
        div.appendChild(
            this.createCheckInput(
                undefined,
                id,
                checked,
                CheckInputType.CHECKBOX,
                CheckInputRole.SWITCH
            )
        )
        div.appendChild(this.createLabel(id, label))
        return div
    }

    private createRadioLabelDiv(name: string, value: string, label: string, checked: boolean) {
        const div = this.createDiv(['form-check'])
        div.appendChild(this.createCheckInput(name, value, checked, CheckInputType.RADIO))
        div.appendChild(this.createLabel(value, label))
        return div
    }

    private createLabelDiv(id: string, label: string, backgroundColor: string) {
        const div = this.createDiv([], backgroundColor)
        div.appendChild(this.createLabel(id, label))
        return div
    }

    private createDiv(classList?: string[], backgroundColor?: string) {
        const div = document.createElement('div')
        div.classList.add(...classList)
        if (backgroundColor) div.style.backgroundColor = backgroundColor

        return div
    }

    private createCheckInput(
        name: string,
        value: string,
        checked: boolean,
        type: string,
        role?: string
    ) {
        const checkEl = document.createElement('input')
        checkEl.classList.add('form-check-input')
        checkEl.setAttribute('id', value)
        checkEl.setAttribute('value', value)
        checkEl.setAttribute('name', name)
        checkEl.setAttribute('type', type)
        checkEl.checked = checked

        if (role) checkEl.setAttribute('role', role)

        return checkEl
    }

    private createLabel(id: string, label: string) {
        const labelEl = document.createElement('Label')
        labelEl.classList.add('form-check-label')
        labelEl.setAttribute('for', id)
        labelEl.innerText = label
        return labelEl
    }

    private createRadioGroupDiv(
        options: string[],
        name: string,
        checkedOption: string,
        divClassList?: string[],
        backgroundColor?: string
    ) {
        const div = this.createDiv(divClassList, backgroundColor)
        options.forEach((option) => {
            div.appendChild(this.createRadioLabelDiv(name, option, option, option == checkedOption))
        })
        return div
    }
}