// import * as Papa from '../../external/papaparse.min.js'

export function load_text_file(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => resolve(event.target.result.toString())
        reader.onerror = (event) => reject(event)
        reader.readAsText(file)
    })
}

/*
export function load_csv_file(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        })
    })
}
*/

export function parse_to_package_hierarchy(used_method_string) {
    const rows = used_method_string.split('\n')
    const data = {
        name: 'root',
        children: []
    }

    rows.forEach((row) => {
        let current_children = data.children

        const fields = row.split('.')

        fields.forEach((field) => {
            let child = current_children.find((child) => child.name === field)

            if (!child) {
                child = {
                    name: field,
                    children: []
                }

                current_children.push(child)
            }

            current_children = child.children
        })
    })

    return data
}
