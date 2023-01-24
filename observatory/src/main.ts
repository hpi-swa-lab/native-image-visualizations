import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

import SankeyTreeVue from './visualizations/SankeyTree.vue'
import TreeLineVue from './visualizations/TreeLine.vue'
import VennVue from './visualizations/VennSets.vue'
import ZoomableCausalityGraphVue from './visualizations/ZoomableCausalityGraph.vue'
import Home from './Home.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/sankey-tree', component: SankeyTreeVue },
    { path: '/tree-line', component: TreeLineVue },
    { path: '/venn', component: VennVue },
    { path: '/zoomable-causality-graph', component: ZoomableCausalityGraphVue }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
