<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { globalConfigStore } from '../../ts/stores'
import MainLayout from '../layouts/MainLayout.vue'
import { CutTool } from '../../ts/Visualizations/CutTool.js'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse';

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutTool | undefined = undefined

onMounted(() => {
    visualization = new CutTool()
    if(multiverse.value.sources.length === 1)
        visualization.setUniverse(multiverse.value.sources[0] as CausalityGraphUniverse)
})

watch(multiverse, (multiverse) => {
    if(multiverse.sources.length === 1)
        visualization.setUniverse(multiverse.sources[0] as CausalityGraphUniverse)
})
</script>

<style>

#cut-tool-root {
  all: initial;
  height: 98%;
}

/* Remove default bullets */
ul {
    list-style-type: none;
}

/* Remove margins and padding from the parent ul */
.unpadded {
    margin: 0;
    padding: 0;
}

body.waiting * {
    cursor: progress;
}

/* Style the caret/arrow */
.caret {
    cursor: pointer;
    user-select: none; /* Prevent text selection */
    grid-row-start: 1;
    grid-column-start: 1;
}

.node-text {
    user-select: none;
    text-overflow: ellipsis;
    white-space: nowrap;
    grid-row-start: 1;
    grid-column-start: 2;
    overflow: hidden;
}

/* Create the caret/arrow with a unicode, and style it */
.caret::before {
    content: "\25B6";
    color: black;
    display: inline-block;
    margin-right: 6px;
}

/* Rotate the caret/arrow icon when clicked on (using JavaScript) */
.caret-down::before {
    transform: rotate(90deg);
}

/* Hide the nested list */
.nested {
    display: none;
    grid-row-start: 3;
    grid-column-start: 1;
    grid-column-end: 5;
    padding-left: 20px;
}

/* Show the nested list when the user clicks on the caret/arrow (with JavaScript) */
.active {
    display: block;
}

.total-size-column {
    float: right;
    grid-row-start: 1;
    grid-column-start: 3;
    text-align: right;
    margin-right: 5px;
    margin-left: 5px;
    color: #606060;
    width: 60px;
}

.cut-size-column {
    float: right;
    margin-right: 5px;
    margin-left: 5px;
    color: #B02020;
    grid-row-start: 1;
    grid-column-start: 3;
    text-align: right;
    width: 60px;
}

.size-bar-outer {
    float: right;
    height: 16px;
    grid-row-start: 1;
    grid-column-start: 2;
    grid-template-columns: 1fr;
    grid-template-rows: 16px;
    background-color: #A0A0A080;
}
.size-bar-outer > * {
    grid-row-start: 1;
    grid-column-start: 1;
}

.size-bar-inner {
    height: 100%;
    width: 0;
    background-color: #FF202060;
}

.purge-percentage-bar-outer {
    margin-top: 1px;
    margin-bottom: 1px;
    border: 1px solid #F0F0F0;
    margin-left: 10px;
    margin-right: 10px;
    width: 60px;
    grid-row-start: 1;
    grid-column-start: 4;

    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 100%;
}

.purge-percentage-bar-inner {
    height: 100%;
    width: 0;
    grid-row-start: 1;
    grid-column-start: 1;
    background-color: #FF000020;
}

.purge-percentage-bar-text {
    width: 100%;
    height: 100%;
    grid-row-start: 1;
    grid-column-start: 1;
    margin-top: -1px;
    color: darkblue;
    text-align: center;
}

.fullscreen {
    width: 100%;
    height: 100%;
}

#loading-panel {
    cursor: wait;
}

.main-grid {
    height: 100%;
    width: 100%;
    /*display: grid;*/
    /*grid-template-columns: 20% 1fr max-content;*/
    /*grid-template-rows: 100%;*/
}

.overview-div {
    float: left;
    width: 20%;
    height: 100%;
    margin-right: 5px;
    overflow-y: scroll;
    resize: horizontal;
}

.imageview-div {
    float: none;
    overflow-x: hidden;
    width: 1fr;
    height: 100%;
    overflow-y: scroll;
    /*resize: horizontal;*/
}

.detail-div {
    float: right;
    width: 50%;
    height: 100%;
}

.hovered-for-purge {
    border: 1px solid #8080FF80;
    background-color: #0000FF10;
}

.selected-for-purge {
    border: 1px solid #8080FF;
    background-color: #0000FF20;
}

.selected-for-detail {
    border: 1px solid #80FF80;
    background-color: #00FF0020;
}

.selectable {
    cursor: crosshair;
}

.cut-row {
    display: grid;
    grid-template-columns: max-content 1fr max-content;
    grid-template-rows: 18px;
}

.image-row {
    display: grid;
    grid-template-columns: max-content 1fr max-content;
    grid-template-rows: 18px;
}

.cut-size-bar {
    background-color: #B0404080;
    height: 2px;
    width: 0;
    margin-top: -2px;
    grid-row-start: 2;
    grid-column-start: 2;
    grid-column-end: 3;
}

.center {
    align-self: center;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.cg-only {
    color: #606060;
}

.node {
    fill: black;
    stroke: black;
    stroke-opacity: 0;
    opacity: 0.8;
    stroke-width: 5;
}

/* For detail view: */
.support-edge {
    stroke: #A0A0A0;
    stroke-dasharray: 0 0.5% 0;
}

.direct-edge {
    stroke: #808080;
}

</style>

<template>
    <MainLayout title="Cut Tool">
        <div id="cut-tool-root">
            <div id="loading-panel" class="fullscreen" hidden>
                <div class="center">
                    <big>Causality Graph is being parsed...</big>
                </div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div class="overview-div">
                    <span><b>Cut Overview:</b></span>
                    <label>
                        <input type="checkbox" checked="checked" @change="CutTool.changePrecomputeCutoffs(this.checked)">
                        Precompute cutoffs
                    </label>
                    <div id="cut-overview-root"></div>
                </div>
                <div class="detail-div" hidden>
                    <svg id="detail-svg" width="100%" height="100%">
                        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                                refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7"/>
                        </marker>

                        <g id="chartpanel">
                            <rect id="zoom-opfer" fill="black" opacity="0" height="100%" width="100%"></rect>
                            <g id="chart"></g>
                        </g>
                    </svg>
                </div>
                <div class="imageview-div">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
