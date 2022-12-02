import * as d3 from 'd3'
import {HierarchyPointLink, HierarchyPointNode} from "d3";
import TreeVisualization, {MyNode, Point, Rectangle} from "./TreeVisualization";

export default class TreeVisualizationSVG extends TreeVisualization {

    constructor() {
        super()
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


        // pre-setup
        const svg = d3.select('body').append('svg');
        const width = document.body.clientWidth;
        const height = document.body.clientHeight;
        const margin = {top: 0, right: 50, bottom: 0, left: 75};
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const defaultViewbox = [
            0,
            0,
            innerWidth,
            innerHeight
        ].join(" ")

        let initialViewBox: string = null;

        const zoomG = svg
            .attr('width', innerWidth)
            .attr('height', innerHeight)
            .attr('viewBox', defaultViewbox)
            .append('g')
                .attr('id', 'zoomG')
                .attr("width", innerWidth - margin.left)
                .attr("height", innerHeight * 0.5)
                .attr('transform', `translate(${margin.left}, ${innerHeight * 0.5})`)

        // TODO clean up, the rect is only for test reasons
        // zoomG.append("rect")
        //     .attr("width", "100%")
        //     .attr("height", innerHeight * 0.5)
        //     .attr("fill", "orange");

        console.log(svg.node(), '\n', zoomG.node())

        const g = zoomG.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        d3.text('../assets/data/used_methods_micronautguide').then(text => {
            let data = this.getDataFromText(text);

            const root: HierarchyPointNode<MyNode> = d3.hierarchy(data) as HierarchyPointNode<MyNode>;
            const dx = 20;
            const dy = innerWidth / 6;
            root.descendants().forEach((d: any, i) => {
                d.id = i;
                d._children = d.children;
                if (d.depth && d.data.name.length !== 7) d.children = null;
            });
            const tree = d3.tree()
                .nodeSize([dx, dy])
                .separation(function(a, b) {
                    let totalWidth = countPrivateLeaves(a) / 2 + countPrivateLeaves(b) / 2;
                    return (totalWidth / dx) + 1;
                })

            let currentViewBox = defaultViewbox;

            svg.call(d3.zoom().on('zoom', (svgTransform) => {
                zoomG.attr('transform', svgTransform.transform)
                update(null, root)
            }));

            const gLink = zoomG.append("g")
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5);

            const gNode = zoomG.append("g")
                .attr("cursor", "pointer")
                .attr("pointer-events", "all");

            function update(event: any | null, source: any/*HierarchyPointNode<MyNode>*/) {
                let duration = 0;

                let viewBoxArray = svg.attr('viewBox').split(' ').map(val => parseFloat(val))

                let viewBox: Rectangle = {x:viewBoxArray[0], y:viewBoxArray[1], width:viewBoxArray[2], height:viewBoxArray[3]}

                if (event) {
                    duration = event && event.altKey ? 2500 : 250;
                }

                // Compute the new tree layout.
                tree(root)

                const nodes = root.descendants()/*.filter(node => node.depth < 3 /!*&& isNodeVisible(flipNode(node), viewBox)*!/)*/.reverse();
                const links = root.links()/*.filter(link => link.target.depth < 3 /!*&& isLinkVisible(flipLink(link), viewBox)*!/)*/;

                console.log(`${nodes.length} nodes, ${links.length} links visible`)


                // figure out the most left and most right node in a top-down tree
                let left: any = root;
                let right: any = root;
                root.eachBefore((node: any) => {
                    if (node.x < left.x) left = node;
                    if (node.x > right.x) right = node;
                });
                // take the far-most left and far-most right in a top-down tree to get the height (because we have a horizontal tree)
                const height = right.x - left.x + margin.top + margin.bottom;


                // define a transition
                if (initialViewBox === null) {
                    initialViewBox = [-margin.left, left.x - margin.top, width, height].join(" ")
                }
                currentViewBox = currentViewBox == defaultViewbox ? initialViewBox : currentViewBox
                const transition = zoomG.transition()
                    .duration(duration)
                    .tween("resize", window.ResizeObserver ? null : () => () => zoomG.dispatch("toggle"))
                console.log(svg.attr('viewBox'))


                // Update the nodes…
                const node = gNode.selectAll("g")
                    .data(nodes, (d: any) => d.id)

                // Enter any new nodes at the parent's previous position.
                const nodeEnter = node.enter().append("g")
                    .attr("transform", d => `translate(${source.y0},${source.x0})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0)
                    .on("click", (evt, d: any) => {
                        d.children ? collapseChildren(d) : d.children = d._children;
                        update(evt, d);
                    });

                nodeEnter.append("circle")
                    .attr("r", (d:any) => d._children && d.id !== 0 ? 5 + (countPrivateLeaves(d)/2) : 5)
                    .attr("fill", (d:any) => d._children ? "#555" : "#999")
                    .attr("stroke-width", 10);

                nodeEnter.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", (d:any) => d._children ? -6 : 6)
                    .attr("text-anchor", (d:any) => d._children ? "end" : "start")
                    .text(d => d.data.name)
                    .clone(true).lower()
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-width", 3)
                    .attr("stroke", "white");

                // Transition nodes to their new position.
                const nodeUpdate = node.merge(nodeEnter).transition(transition)
                    .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
                    .attr("fill-opacity", 1)
                    .attr("stroke-opacity", 1);

                // Transition exiting nodes to the parent's new position.
                const nodeExit = node.exit().transition(transition).remove()
                    .attr("transform", d => `translate(${source.y},${source.x})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0);


                let linkGenerator = d3.linkHorizontal<any, any>().x((d:any) => d.y).y((d:any) => d.x)

                // Update the links…
                const link = gLink.selectAll("path")
                    .data(links, (d:any) => d.target.id);

                // Enter any new links at the parent's previous position.
                const linkEnter = link.enter().append("path")
                    .attr("d", d => {
                        const o = {x: source.x0, y: source.y0};
                        return linkGenerator({source: o, target: o});
                    });

                // Transition links to their new position.
                link.merge(linkEnter).transition(transition)
                    .attr("d", linkGenerator);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition(transition).remove()
                    .attr("d", d => {
                        const o = {x: source.x, y: source.y};
                        return linkGenerator({source: o, target: o});
                    });

                // Stash the old positions for transition.
                root.eachBefore((d: any) => {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }

            update(null, root);
        });


        // ##################################################################
        // ### HELPER FUNCTIONS #############################################
        // ##################################################################

        function isPointInRect(point: Point, viewbox: Rectangle): boolean {
            return point.x >= viewbox.x && point.x < viewbox.x + viewbox.width &&
                point.y >= viewbox.y && point.y < viewbox.y + viewbox.height
        }

        function isNodeVisible(node: Point, viewbox: Rectangle): boolean {
            return isPointInRect(node, viewbox)
        }

        function isLinkVisible(link: HierarchyPointLink<any>, viewbox: Rectangle): boolean {
            if (link.source.x < viewbox.x && link.target.x < viewbox.x) return false
            if (link.source.y < viewbox.y && link.target.y < viewbox.y) return false
            if (link.source.x > (viewbox.x + viewbox.width) && link.target.x > (viewbox.x + viewbox.width)) return false
            if (link.source.y > (viewbox.y + viewbox.height) && link.target.y > (viewbox.y + viewbox.height)) return false
            return true
        }

        function flip(point: Point): Point {
            return {
                x: point.y,
                y: point.x
            }
        }

        function flipNode(node: HierarchyPointNode<any>): Point {
            return flip(node);
        }

        function flipLink(link: HierarchyPointLink<any>): HierarchyPointLink<any> {
            return {source: flip(link.source) as any, target: flip(link.target) as any};
        }

        function collapseChildren(d: any) {
            if (!d.children) return;

            d.children.forEach((child:any) => collapseChildren(child))
            d.children = null;
        }

        function countPrivateLeaves(node: any): number {
            if (!node._children) {
                return 1
            }
            return node._children.reduce((sum: number, child:any) => sum + countPrivateLeaves(child), 0)
        }
    }
}

