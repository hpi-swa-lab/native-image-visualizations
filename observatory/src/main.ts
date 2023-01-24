import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

import SankeyTreeVue from './visualizations/SankeyTree.vue'
import TreeLineVue from './visualizations/TreeLine.vue'
import VennVue from './visualizations/VennSets.vue'
import CausalityGraphVue from './visualizations/CausalityGraph.vue'
import Home from './Home.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/sankey-tree', component: SankeyTreeVue },
    { path: '/tree-line', component: TreeLineVue },
    { path: '/venn', component: VennVue },
    { path: '/causality-graph', component: CausalityGraphVue }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
