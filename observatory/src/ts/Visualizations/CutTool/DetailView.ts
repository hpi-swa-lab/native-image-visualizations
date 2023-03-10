import * as d3dag from 'd3-dag';
import * as d3 from 'd3';
import {ReachabilityHyperpathEdge} from '../../Causality/CausalityGraph';

export class DetailView {
    domRoot: HTMLDivElement
    methodList: string[]
    typeList: string[]

    constructor(domRoot: HTMLDivElement, methodList: string[], typeList: string[]) {
        this.domRoot = domRoot;
        this.methodList = methodList;
        this.typeList = typeList;
    }

    public renderGraphOnDetailView(edges: ReachabilityHyperpathEdge[] | undefined) {
        const htmlSvg = this.domRoot.querySelector('#chart')!
        htmlSvg.textContent = ''

        const nothingSelected = !edges
        this.domRoot.hidden = nothingSelected
        if(nothingSelected)
            return

        if(edges.length === 0)
            return

        // Graph construction
        const nodesSet: Set<number> = new Set()
        const links: VisGraphLink[] = []

        edges.forEach(e => {
            if(e.src === -1 || e.dst === -1)
                return

            nodesSet.add(e.src);
            nodesSet.add(e.dst);
            const newObj: VisGraphLink = { source: e.src, target: e.dst }
            if (e.via_type)
                newObj.via_type = e.via_type
            links.push(newObj);
        });

        const nodeIds = [...nodesSet]

        // Modeling adjacency through indices
        links.forEach((d, i) => {
            links[i].source = nodeIds.indexOf(links[i].source);
            links[i].target = nodeIds.indexOf(links[i].target);
        });

        const nodes: VisGraphNode[] = nodeIds.map((d, i) => { return { index: i, mid: d, name: this.methodList[d] ?? '<root>', adj: [] }})


        const dag: d3dag.Dag<VisGraphNode, VisGraphLink> = d3dag.dagStratify()
            .id((arg: {index: number}) => arg.index.toString())
            .parentData((arg: VisGraphNode) => arg.adj.map(e => [e.target.toString(), e]))
            (nodes);
        const nodeRadius = 20;
        const layout = d3dag
            .sugiyama() // base layout
            .decross(d3dag.decrossTwoLayer()) // minimize number of crossings
            .nodeSize((node) => [(node ? 3.6 : 0.25) * nodeRadius, 3 * nodeRadius]);
        const { width, height } = layout(dag as any);

        const d3Root = d3.select(this.domRoot)

        // --------------------------------
        // This code only handles rendering
        // --------------------------------
        const outerSvg = d3Root.select('#detail-svg')
        outerSvg.attr('viewBox', [0, 0, width, height].join(' '));
        const svgSelection = d3Root.select('#chart');

        // How to draw edges
        const line = d3
            .line()
            .curve(d3.curveCatmullRom)
            .x(d => d[0])
            .y(d => d[1]);

        // Plot edges
        const linksSelection = svgSelection
            .append('g')
            .selectAll('path')
            .data(dag.links())
            .enter()
            .append('path')
            .attr('d', ({ points }) => line(points.map(({ x, y }) => [x, y])))
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('class', ({data}) => {
                if(data.via_type !== undefined) {
                    return 'support-edge'
                } else {
                    return 'direct-edge'
                }
            })

        linksSelection
            .append('title')
            .text(({data}) => data.via_type !== undefined ? this.typeList[data.via_type] : '')

        // Select nodes
        const nodesSelection = svgSelection
            .append('g')
            .selectAll('g')
            .data(dag.descendants())
            .enter()
            .append('g')
            .attr('transform', ({ x, y }) => `translate(${x}, ${y})`);

        // Plot node circles
        const nodeCircles = nodesSelection
            .append('circle')

        nodeCircles
            .attr('r', nodeRadius)
            .attr('fill', d => getColorAccordingToCausalityGraphNodeType(d.data.name))

        nodesSelection
            .append('title')
            .text(d => d.data.name)

        const textSize = 20

        // Add text to nodes
        const nodeLabels = nodesSelection
            .append('text')

        nodeLabels
            .text((d) => getUnqualifiedCausalityGraphNodeName(d.data.name))
            .attr('font-family', 'sans-serif')
            .attr('text-anchor', 'left')
            .attr('fill', 'black')
            .attr('dominant-baseline', 'middle')
            .attr('x', nodeRadius * 1.2)
            .attr('font-size', textSize)


        function onZoom() {
            const transform = d3.zoomTransform(d3Root.select<Element>('#chartpanel').node()!);

            function transX(num: number)
            {
                return num * transform.k + transform.x
            }

            function transY(num: number)
            {
                return num * transform.k + transform.y;
            }

            nodesSelection
                .attr('transform', ({x, y}) => `translate(${transX(x!)}, ${transY(y!)})`)
            nodeCircles
                .attr('r', transform.k * nodeRadius)

            linksSelection.attr('d', ({ points }) => line(points.map(({x, y}) => {return [transX(x), transY(y)]})))
                .attr('stroke-width', transform.k * 3)

            nodeLabels
                .attr('font-size', transform.k * textSize)
                .attr('x', transform.k * nodeRadius * 1.2)
        }

        const zoom = d3.zoom().on('zoom', onZoom);
        d3Root.select<Element>('#chartpanel').call(zoom.transform, d3.zoomIdentity)
        d3Root.select<Element>('#chartpanel').call(zoom);
    }
}

interface VisGraphNode
{
    index: number
    name: string
    adj: VisGraphLink[]
    mid: number
}

interface VisGraphLink
{
    source: number
    target: number
    via_type?: number
}

function getUnqualifiedCausalityGraphNodeName(fullyQualifiedName: string): string {
    const parenIndex = fullyQualifiedName.lastIndexOf('/')
    if (parenIndex !== -1)
        fullyQualifiedName = fullyQualifiedName.substring(parenIndex + 1)
    return fullyQualifiedName.replaceAll(/(?<![A-Za-z0-9])([a-z]\w+\.)+/g, '')
}

function getColorAccordingToCausalityGraphNodeType(fullyQualifiedName: string): string {
    if(fullyQualifiedName.endsWith('[Instantiated]'))
        return '#FF4040'
    if(fullyQualifiedName.endsWith('[Reflection Registration]'))
        return '#D0A000'
    if(fullyQualifiedName.endsWith('[JNI Registration]'))
        return '#904040'
    if(fullyQualifiedName.endsWith('[Configuration File]'))
        return '#505050'
    if(fullyQualifiedName.endsWith('[Initial Registrations]'))
        return '#C0C0C0'
    if(fullyQualifiedName.endsWith('[User-Requrested Feature Registration'))
        return '#808080'
    if(fullyQualifiedName.endsWith('[Automatic Feature Registration]'))
        return '#A0A0A0'
    if(fullyQualifiedName.endsWith('[Unknown Heap Object]'))
        return '#1010E0'
    if(fullyQualifiedName.endsWith('[Build-Time]'))
        return '#4040FF'
    if(fullyQualifiedName.endsWith('[Reachability Callback]'))
        return '#E0E000'
    if(fullyQualifiedName.includes('(')) // Method reachable
        return '#20C020'

    // Class reachable
    return '#40A0DF'
}
