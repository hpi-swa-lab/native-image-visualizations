export function load_text_file(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => resolve(event.target.result.toString())
        reader.onerror = (event) => reject(event)
        reader.readAsText(file)
    })
}

export function parse_to_package_hierarchy(used_methods_string) {
    const data = {
        name: 'root',
        children: []
    }

    used_methods_string.split('\n').forEach((row) => {
        let current_children = data.children

        row.split('.').forEach((pathSegment) => {
            let child = current_children.find((child) => child.name === pathSegment)

            if (!child) {
                child = {
                    name: pathSegment,
                    children: []
                }

                current_children.push(child)
            }

            current_children = child.children
        })
    })

    return data
}

export function extract_classes(classes_report_string) {
    const classes = []

    classes_report_string.split('\n').forEach((row) => {
        const split_row = row.split('.')
        const class_name = split_row[split_row.length - 1]
        
        classes.push({
            full_name: row,
            class_name: class_name
        })
    })

    return classes
}
