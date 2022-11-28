
export async function constructClassBubbles(classes, window_extent, node_size) {
    const nodes = []
    colors = {}

    classes.forEach((class_node) => {
        let color = colors[class_node.class_name]
        if (!color) {
            color = random_color()
            colors[class_node.class_name] = color
        }

        nodes.push({
            full_name: class_node.full_name,
            label: class_node.class_name,
            color: color
        })
    })

    return nodes
}

function random_color() {}

