import * as d3 from 'd3'
import {HierarchyPointLink, HierarchyPointNode, D3ZoomEvent} from "d3";
import TreeVisualization from "./TreeVisualization";

interface MyNode {
    name: string,
    children: MyNode[]
}

interface Point {
    x: number;
    y: number;
}

interface Rectangle extends Point {
    height: number;
    width: number;
}

export default class TreeVisualizationOnCanvas implements TreeVisualization {
    constructor() {
    }

    generate(): void {
        console.log('This will soon be a nice Tree')
        // var svg = d3.select('body').append('svg').attr('width', 200).attr('height', 200)
        //
        // svg.append('circle')
        //     .attr('cx', 100)
        //     .attr('cy', 100)
        //     .attr('r', 50)
        //     .attr('stroke', 'black')
        //     .attr('fill', '#69a3b2')

        const width = document.body.clientWidth;
        const height = document.body.clientHeight;
        const margin = {top: 20, right: 150, bottom: 20, left: 30};
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const parentSpacing = 0.7;
        const childSpacing = 3;

        let canvas = d3.select('body').append<HTMLCanvasElement>('canvas');
        canvas.node().width = width;
        canvas.node().height = height;

        let context = canvas.node().getContext('2d', {alpha: false})
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.node().width, canvas.node().height)

        d3.text('../assets/data/used_methods_micronautguide').then(text => {
            const data = this.getDataFromText(text);

            const tree = d3.tree()
                // .nodeSize([15, 250])
                .nodeSize([15, 250])
                .separation((a, b) => a.parent === b.parent ? parentSpacing : childSpacing)
                (d3.hierarchy(data))

            console.log(tree)

            const linkGenerator = d3.linkHorizontal<HierarchyPointLink<any>, HierarchyPointNode<any>>()
                .x(d => d.y)
                .y(d => d.x)
                .context(context);

            init()

            function drawNode(node: HierarchyPointNode<any>) {
                context.beginPath()
                context.moveTo(node.y, node.x)
                context.arc(node.y, node.x, 4, 0, 2 * Math.PI)
                context.fillStyle = 'black'
                context.fill()

                context.beginPath()
                context.fillStyle = '#000'
                console.debug(node)
                context.fillText(node.data.name, node.y - 4, node.x + 20)
            }

            function drawLink(link: HierarchyPointLink<any>) {
                context.beginPath()
                linkGenerator(link)
                context.strokeStyle = 'black'
                context.stroke()
            }

            function redraw(visibleRect: Rectangle) {
                const links = tree.links().filter(link => link.target.depth < 10 && isLinkVisible(flipLink(link), visibleRect))
                const nodes = tree.descendants().filter(node => node.depth < 10 &&  isNodeVisible(flipNode(node), visibleRect))

                console.debug(links)

                context.beginPath()
                for (const link of links) {
                    drawLink(link)
                }

                context.beginPath()
                for (const node of nodes) {
                    drawNode(node)
                }


                let depth = d3.extent(tree.descendants(), d => d.depth)
                console.debug(`${nodes.length} nodes, ${links.length} links, with a depth of ${depth[1]}`)
            }

            function zoomed({transform}: D3ZoomEvent<any, any>) {
                console.debug(transform)
                context.save()
                context = drawBackground(context, canvas.node())
                let visibleRect: Rectangle// = {
                //     x: 0,
                //     y: 0,
                //     width: canvas.node().width,
                //     height: canvas.node().height,
                // }
                if (transform) {
                    visibleRect = {
                        x: -transform.x / transform.k,
                        y: -transform.y / transform.k,
                        width: canvas.node().width / transform.k,
                        height: canvas.node().height / transform.k,
                    }
                    console.debug(visibleRect)
                    context.translate(transform.x, transform.y)
                    context.scale(transform.k, transform.k)
                }

                redraw(visibleRect)
                context.restore()
            }
            function init() {
                drawBackground(context, canvas.node())
                let visibleRect: Rectangle = {
                    x: 0,
                    y: 0,
                    width: canvas.node().width,
                    height: canvas.node().height,
                }
                redraw(visibleRect)
            }

            function drawBackground(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): CanvasRenderingContext2D{
                context.fillStyle = 'white'
                context.fillRect(0, 0, canvas.width, canvas.height)
                return context
            }

            d3.select(context.canvas).call(d3.zoom()
                // FIXME setting scale extent let's you not zoom out further
                // .scaleExtent([1, 8])
                .on("zoom", zoomed));


            function isPointInRect(point: Point, rect: Rectangle): boolean {
                return point.x >= rect.x && point.x < rect.x + rect.width &&
                    point.y >= rect.y && point.y < rect.y + rect.height
            }

            function isNodeVisible(node: Point, visibleRect: Rectangle): boolean {
                return isPointInRect(node, visibleRect)
            }

            function isLinkVisible(link: HierarchyPointLink<any>, visibleRect: Rectangle): boolean {
                if (link.source.x < visibleRect.x && link.target.x < visibleRect.x) return false
                if (link.source.y < visibleRect.y && link.target.y < visibleRect.y) return false
                if (link.source.x > (visibleRect.x + visibleRect.width) && link.target.x > (visibleRect.x + visibleRect.width)) return false
                if (link.source.y > (visibleRect.y + visibleRect.height) && link.target.y > (visibleRect.y + visibleRect.height)) return false
                return true
            }

            function flip(point:HierarchyPointNode<any>): Point {
                return {
                    x: point.y,
                    y: point.x
                }
            }

            function flipNode(node: HierarchyPointNode<any>): Point {
                return flip(node);
            }

            function flipLink(link: HierarchyPointLink<any>): HierarchyPointLink<any> {
                return {source: flip(link.source) as HierarchyPointNode<any>, target: flip(link.target) as HierarchyPointNode<any>};
            }
        })


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
