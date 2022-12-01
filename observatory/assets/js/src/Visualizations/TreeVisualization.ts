import * as d3 from 'd3'

export interface MyNode {
    name: string,
    children: MyNode[]
}

export interface Point {
    x: number;
    y: number;
}

export interface Rectangle extends Point {
    height: number;
    width: number;
}

export default class TreeVisualization implements Visualization {
    constructor() {}

    generate(): void {
        console.log('This will soon be a nice Tree')
        var svg = d3.select('body').append('svg').attr('width', 200).attr('height', 200)

        svg.append('circle')
            .attr('cx', 100)
            .attr('cy', 100)
            .attr('r', 50)
            .attr('stroke', 'black')
            .attr('fill', '#69a3b2')
    }

    getDataFromText(text: string): MyNode {
        let data: MyNode = {
            name: "root",
            children: []
        };
        data = this.createHierarchyFromPackages(data, text)
        data = this.reducePackageNames(data)

        return data
    }

    createHierarchyFromPackages(data: MyNode, text: string): MyNode {
        let rows = text.split('\n');
        rows.forEach(row => {
            if(row.includes('$$')){
                return
            }
            let fields = row.split('.');
            fields.pop() // removes methods
            fields.pop() // removes classes
            let current = data.children;
            for (let field of fields) {
                if (!current.find(child => child.name === field)) {
                    current.push({
                        name: field,
                        children: []
                    })

                }
                current = current.find(child => child.name === field).children;
            }
        })

        return data
    }

    reducePackageNames(data: MyNode): MyNode {
        data.children.forEach(pkg => {
            while(pkg.children.length === 1)
                if (pkg.children.length === 1){
                    pkg.name += '.' + pkg.children[0].name;
                    pkg.children = pkg.children[0].children;
                }
        })
        return data
    }
}
