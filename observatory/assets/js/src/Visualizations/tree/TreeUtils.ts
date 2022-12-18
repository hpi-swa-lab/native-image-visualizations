import {HierarchyPointNode} from "d3";
import * as d3 from "d3";

export const margin = {top: 0, right: 50, bottom: 0, left: 75};

export interface MyNode {
    name: string,
    children: MyNode[]
    parent: MyNode
    universes: Set<number>
    isModified: boolean
    isFiltered: boolean
//     sizes?: { [id: string] : number; }
//     size?: number
//     exclusiveSizes?: { [id: string] : number; }
}

export interface Tree {
    layout?: d3.TreeLayout<unknown>;
    root?: HierarchyPointNode<MyNode>;
    leaves: MyNode[];
    sets: string[];
    treeData: MyNode
}

export interface SvgSelections {
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    zoomG: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    gNode: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    gLink: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
}

export interface UniverseProps {
    name: string,
    color: d3.Color
}

export interface Dictionary<T> {
    [id: string]: T
}

export interface TreeNodesFilter {
    universes: Set<string>;
    showUnmodified: boolean;
    ignore: boolean // true, if this filter should be ignored; otherwise false
}

export function setAttributes(el:HTMLElement, attrs: { [key: string]: string}) {
    for(const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

export function createHierarchyFromPackages(universeId: number, text: string, dataTree: MyNode, leaves: Set<MyNode>, sets: Set<string>) {
    for (const row of text.split('\n')) {
        if (row == '' || row.includes('$$')) continue
        let current = dataTree
        // let pathSegments = row.split(/[.$]/)
        let pathSegments = row.split('.')
        pathSegments.pop() // remove methods
        pathSegments.pop() // remove classes
        for (let i = 0; i < pathSegments.length; i++) {
            let child = current.children.find((child) => child.name === pathSegments[i])
            if (child) {
                child.universes.add(universeId)
            } else {
                child = {
                    name: pathSegments[i],
                    children: [],
                    parent: current,
                    universes: new Set<number>().add(universeId),
                    isModified: false,
                    isFiltered: false
                }
                current.children.push(child)
            }
            sets.add(Array.from(child.universes).join(''))
            current = child
            if (i === pathSegments.length - 1)
                leaves.add(child)
        }


    }
}

export function markNodesModifiedFromLeaves(leaves: MyNode[]) {
    for (const leave of leaves) {
        if(leave.universes.size !== 1 ) continue
        markModified(leave)
    }
}

function markModified(node: MyNode) {
    if (node.isModified) return
    node.isModified = true
    if (node.parent !== undefined)
        markModified(node.parent)
}

export function filterNodesFromLeaves(leaves: MyNode[], filter: TreeNodesFilter) {
    for (const leave of leaves) {
        if(leave.universes.size < 1) continue
        if(filter.showUnmodified) {
            if (!leave.isModified || Array.from(leave.universes).every(u => filter.universes.has(u.toString()))) {
                markFiltered(leave)
            }
        } else if (leave.isModified && Array.from(leave.universes).every(u => filter.universes.has(u.toString()))) {
            markFiltered(leave)
        }
    }
}

function markFiltered(node: MyNode) {
    if (node.isFiltered) return
    node.isFiltered = true
    if (node.parent !== undefined)
        markFiltered(node.parent)
}

export function removeFilterFromTree(node: MyNode) {
    node.isFiltered = false;
    node.children.forEach(removeFilterFromTree);
}

export function collapseChildren(d: any) {
    if (!d.children) return;

    d.children.forEach((child: any) => collapseChildren(child))
    d.children = null;
}

export function countPrivateLeaves(node: any): number {
    if (!node._children) {
        return 1
    }
    return node._children.reduce((sum: number, child: any) => sum + countPrivateLeaves(child), 0)
}



// ##########################################################################################################
// ##### UPDATE TREE ########################################################################################
// ##########################################################################################################

export function updateTree(event: any | null,
                    sourceNode: any/*HierarchyPointNode<MyNode>*/,
                    treeFilter: TreeNodesFilter,
                    tree: Tree,
                    svgSelections: SvgSelections,
                    universePropsDict: Dictionary<UniverseProps>) {

    let duration = 0;

    if (event) {
        duration = event && event.altKey ? 2500 : 250;
    }

    // this is for forcing a re-layouting of the tree's nodes!
    // remove to keep the ful tree's layout, but just remove single nodes in their positions
    if(treeFilter && !treeFilter.ignore) {
        tree.root.eachBefore((node: any) => {
            if (!node._children) return;
            node.children = node._children.filter((child: any) => child.data.isFiltered)
        })
    }

    // Compute the new treeLayout layout.
    tree.layout(tree.root)

    const nodes = tree.root.descendants().reverse();
    const links = tree.root.links().filter(link => link.target.data.isFiltered);

    // console.debug(`${nodes.length} nodes, ${links.length} links visible`)


    // figure out the most left and most right node in a top-down treeLayout
    let left: any = tree.root;
    let right: any = tree.root;
    tree.root.eachBefore((node: any) => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
    });
    // take the far-most left and far-most right in a top-down treeLayout to get the height (because we have a horizontal treeLayout)
    const height = right.x - left.x + margin.top + margin.bottom;


    // define a transition
    const transition = svgSelections.zoomG.transition()
        .duration(duration)
        .tween("resize", window.ResizeObserver ? null : () => () => svgSelections.zoomG.dispatch("toggle"))


    // Update the nodes…
    const node = svgSelections.gNode.selectAll("g")
        .data(nodes, (d: any) => d.id)

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${sourceNode.y0},${sourceNode.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (evt, d: any) => {
            treeFilter.ignore = true
            d.children ? collapseChildren(d) : d.children = d._children.filter((child:any) => child.data.isFiltered);
            updateTree(evt, d, treeFilter, tree, svgSelections, universePropsDict);
        });

    let nodeEnterCircle = nodeEnter.append("circle")
        .attr("r", (d: any) => d._children && d.id !== 0 ? 5 + (countPrivateLeaves(d) / 2) : 5)
        .attr("fill", (d: any) => {
            if (d.data.universes.size == 1) {
                return universePropsDict[Array.from(d.data.universes).join('')].color.toString()
            } else if (d.data.isModified) {
                return universePropsDict['modified'].color.toString()
            }
            else {
                return '#555'
            }

            // d.data.universes.size == 0 ? '#555' : universePropsDict[Array.from(d.data.universes).join('')].color.toString()
        })
        // Add the pattern
        // .attr('fill', 'url(#diagonalHatch)')
        // .attr('stroke', '#ff0000')
        // Add the mask
        // .attr("style", "mask:url(#mask);")
        .attr("stroke-width", 10);

    // see source code: https://d3-graph-gallery.com/graph/interactivity_tooltip.html
    // Three function that change the tooltip when user hover / move / leave a cell
    let mouseover = function(event:MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip.style("opacity", 1)
    }
    let mousemove = function(event:MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip
            .html(`**Node data:**
                            <br>isFiltered: ${d.data.isFiltered}
                            <br>isModified: ${d.data.isModified}
                            <br>universes: ${universePropsDict[Array.from(d.data.universes).join('')].name}
                            <br>has children: ${d.children?.length || undefined}
                            <br>has _children: ${(d as any)._children?.length || undefined}
                            `)
            .style("left", (event.x +20) + "px")
            .style("top", (event.y) + "px")
    }
    let mouseout = function(event:MouseEvent, d: HierarchyPointNode<MyNode>) {
        svgSelections.tooltip.style("opacity", 0)
    }

    nodeEnterCircle.on("mouseover", (event, d) => mouseover(event, d))
        .on("mousemove", (event, d) => mousemove(event, d))
        .on("mouseout", (event, d) => mouseout(event, d))


    nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", (d: any) => d._children ? -6 : 6)
        .attr("text-anchor", (d: any) => d._children ? "end" : "start")
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
        .attr("transform", d => `translate(${sourceNode.y},${sourceNode.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);


    let linkGenerator = d3.linkHorizontal<any, any>().x((d: any) => d.y).y((d: any) => d.x)

    // Update the links…
    const link = svgSelections.gLink.selectAll("path")
        .data(links, (d: any) => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link.enter().append("path")
        .attr("d", d => {
            const o = {x: sourceNode.x0, y: sourceNode.y0};
            return linkGenerator({source: o, target: o});
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition)
        .attr("d", linkGenerator);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition(transition).remove()
        .attr("d", d => {
            const o = {x: sourceNode.x, y: sourceNode.y};
            return linkGenerator({source: o, target: o});
        });

    // Stash the old positions for transition.
    tree.root.eachBefore((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}