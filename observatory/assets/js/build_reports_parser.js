import * as Papa from 'papaparse'

export function load_text_file(file) {
    return new Promise((resolve, reject) => {
        reader = new FileReader()
        reader.onload = (event) => resolve(event.target.result.toString())
        reader.onerror = (event) => reject(event)
        reader.readAsText()
    })
}

export function load_csv_file(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        })
    })
}

export function parse_to_package_hierarchy(used_method_string) {
    const rows = text.split('\n')
    const data = {
        name: 'root',
        children: []
    }

    let current_children = data.children
    rows.forEach((row) => {
        const fields = row.split('.')

        fields.forEach((field) => {
            const child = current.find(child => child.name === field)

            if (!child) {
                current.push({
                    name: field,
                    children: []
                })
            }

            current = child.children
        })
    })

    return data
}
