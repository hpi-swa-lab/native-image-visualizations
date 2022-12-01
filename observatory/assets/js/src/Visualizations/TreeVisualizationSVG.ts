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

        // const treeLayout = d3.tree().size([innerHeight, innerWidth]);

        const zoomG = svg
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', defaultViewbox)
            .append('g');

        const g = zoomG.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        d3.text('../assets/data/used_methods_micronautguide').then(text => {
            let data = this.getDataFromText(text);

            const root: HierarchyPointNode<MyNode> = d3.hierarchy(data) as HierarchyPointNode<MyNode>;
            const dx = 10;
            const dy = innerWidth / 6;
            const tree = d3.tree().nodeSize([dx, dy])

            let currentViewBox = defaultViewbox;

            svg.call(d3.zoom().on('zoom', (svgTransform) => {
                // zoomG.attr('transform', svgTransform.transform)
                // svg.attr('transform', svgTransform.transform)

                let currentViewBoxArray = currentViewBox.split(' ').map(val => parseFloat(val))
                let initialViewBoxArray = initialViewBox.split(' ').map(val => parseFloat(val))
                let newViewBox = [
                    // currentViewBoxArray[0] - (svgTransform.transform.x / svgTransform.transform.k),
                    // currentViewBoxArray[0] - (svgTransform.transform.y / svgTransform.transform.k),
                    -svgTransform.transform.x / svgTransform.transform.k,
                    -svgTransform.transform.y / svgTransform.transform.k,
                    initialViewBoxArray[2] / svgTransform.transform.k,
                    initialViewBoxArray[3] / svgTransform.transform.k
                ].join(" ");

                console.debug('init vb:', initialViewBox, 'old vb: ',  currentViewBox, ', new vb: ', newViewBox, ', transform: ', svgTransform.transform)
                currentViewBox = newViewBox

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

            function update(event: any | null, source: HierarchyPointNode<MyNode>) {
                let duration = 0;

                let viewBoxArray = svg.attr('viewBox').split(' ').map(val => parseFloat(val))
                let viewBox: Rectangle = {x:viewBoxArray[0], y:viewBoxArray[1], width:viewBoxArray[2], height:viewBoxArray[3]}

                if (event) {
                    duration = event && event.altKey ? 2500 : 250;

                    // zoomG.append('div')
                    //     .attr('width', viewBox.width)
                    //     .attr('height', viewBox.height)
                    //     .attr('transform', `translate(${viewBox.x},${viewBox.y})`)
                    //     .attr('background-color', 'orange')
                }

                // Compute the new tree layout.
                tree(root)

                const nodes = root.descendants().filter(node => node.depth < 10 && isNodeVisible(flipNode(node), viewBox));
                const links = root.links().filter(link => link.target.depth < 10 && isLinkVisible(flipLink(link), viewBox));

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
                const transition = svg.transition()
                    .duration(duration)
                    .attr("viewBox", currentViewBox)
                    .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));
                console.log(svg.attr('viewBox'))


                // Update the nodes…
                const node = gNode.selectAll("g")
                    .data(nodes, (d: any) => d.id);

                // Enter any new nodes at the parent's previous position.
                const nodeEnter = node.enter().append("g")
                    .attr("transform", d => `translate(${source.y},${source.x})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0)
                    .on("click", (evt, d) => {
                        d.children = d.children ? null : d.children;
                        update(evt, d);
                    });

                nodeEnter.append("circle")
                    .attr("r", 2.5)
                    .attr("fill", d => d.children ? "#555" : "#999")
                    .attr("stroke-width", 10);

                nodeEnter.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", d => d.children ? -6 : 6)
                    .attr("text-anchor", d => d.children ? "end" : "start")
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
                    .data(links, (d:any) => d.target.name);

                // Enter any new links at the parent's previous position.
                const linkEnter = link.enter().append("path")
                    .attr("d", d => {
                        const o = {x: source.x, y: source.y};
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
                    d.x = d.x;
                    d.y = d.y;
                });
            }

            update(null, root);

            // const links = treeLayout(root).links();
            // const linkGenerator = d3.linkHorizontal()
            //     .x((d:any) => d.y)
            //     .y((d:any) => d.x);
            //
            // g.selectAll('path').data(links)
            //     .enter().append('path')
            //     .attr('d', linkGenerator as any);
            //
            // g.selectAll('circle')
            //     .data(root.descendants())
            //     .enter().append('circle')
            //     .attr("cx", (d:any) => d.y)
            //     .attr("cy", (d:any) => d.x)
            //     .attr("r", 5)
            //     .attr("fill", "#56c2a3")
            //     .on('mouseover', (d, i) => {
            //     })
            //     .on('mouseout', (d, i) => {
            //         d3.select(this).transition()
            //             .duration('50')
            //             .attr('opacity', '1')
            //     })
            //
            //
            // g.selectAll('text').data(root.descendants())
            //     .enter().append('text')
            //     .attr('x', (d:any) => d.y)
            //     .attr('y', (d:any) => d.x + 3)
            //     .attr('dy', '0.32em')
            //     .attr('text-anchor', d => d.children ? 'middle' : 'start')
            //     .attr('font-size', d => 2 - d.depth *0.5 + 'em')
            //     .text(d => d.data.name);

        });

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
    }
}

