import * as d3 from 'd3'

export type UniverseProps = {
    name: string
    color: d3.Color
}

export type Dictionary<T> = {
    [id: string]: T
}