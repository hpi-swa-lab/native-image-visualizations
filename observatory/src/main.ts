import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import HierarchyBubblesVue from './visualizations/HierarchyBubbles.vue'
import SankeyTreeVue from './visualizations/SankeyTree.vue'
import TreeLineVue from './visualizations/TreeLine.vue'
import VennVue from './visualizations/Venn.vue'
import ZoomableCausalityGraphVue from './visualizations/ZoomableCausalityGraph.vue'
import Home from './Home.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/hierarchy-bubbles', component: HierarchyBubblesVue },
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
