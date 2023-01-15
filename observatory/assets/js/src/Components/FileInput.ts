export interface FileInputContainer {
    input: HTMLElement
    container: HTMLElement
    submitButton: HTMLElement
}

export default class FileInput {
    constructor() {
    }

    create(visualizationCallback: Function, browsingDisabled: boolean = false): FileInputContainer {
        console.debug('create InputField')
        const container = document.createElement('div')
        container.setAttribute('id', 'cb-control-container')
        container.classList.add('input-container', 'px-3', 'pt-3')
        const form = document.createElement('form')

        const title = document.createElement('h3')
        title.innerText = 'File Input'

        const input = document.createElement('input')
        input.setAttribute('id', 'input-file')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', '.txt')
        input.classList.add('form-control')
        input.multiple = true
        input.disabled = browsingDisabled

        const button = document.createElement('button')
        button.setAttribute('id', 'button-confirm')
        button.setAttribute('type', 'submit')
        button.classList.add('btn', 'btn-secondary', 'mt-2')
        button.innerText = 'Generate Graph'

        form.appendChild(title)
        form.appendChild(input)
        form.appendChild(button)

        form.addEventListener('submit', (e) => this.onSubmit(e, input.files, visualizationCallback))

        container.appendChild(form)

        document.body.appendChild(container)

        return {
            input: input,
            container: container,
            submitButton: button
        }
    }


    onSubmit(e: SubmitEvent, files: FileList, visualizationCallback: Function) {
        console.log('generate viz')

        e.preventDefault() // prevent page refresh
        // TODO comment in for final version
            /*if (input.files.length < 2 ) {
                    errorMessages.push("I'm missing the input file.")
                    return
                } else*/
        if (files.length > 2) {
            console.error('Too many file, I only need 2 input files.')
            return
        }

        console.log(files)
        visualizationCallback(files)
    }

}