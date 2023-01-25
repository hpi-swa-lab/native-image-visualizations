import { createApp } from 'vue'
import './style.css'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

import HierarchyBubblesVue from './components/visualizations/HierarchyBubbles.vue'
import SankeyTreeVue from './components/visualizations/SankeyTree.vue'
import TreeLineVue from './components/visualizations/TreeLine.vue'
import VennVue from './components/visualizations/Venn.vue'
import CausalityGraphVue from './components/visualizations/CausalityGraph.vue'
import Home from './Home.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/hierarchy-bubbles', component: HierarchyBubblesVue },
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
// app.use(router)
app.mount('#app')
