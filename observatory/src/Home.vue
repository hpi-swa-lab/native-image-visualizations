<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
</script>

<template>
    <MainLayout>
        <template #title> Home </template>
        <template #controls>
            <li class="btn btn-primary">
                <router-link to="/zoomable-causality-graph"> Zoomable Causality Graph </router-link>
            </li>
            <li class="btn btn-primary">
                <router-link to="/hierarchy-bubbles"> Hierarchy Bubbles </router-link>
            </li>
            <li class="btn btn-primary">
                <router-link to="/sankey-tree"> Sankey Tree </router-link>
            </li>
            <li class="btn btn-primary">
                <router-link to="/venn"> Venn </router-link>
            </li>
            <li class="btn btn-primary">
                <router-link to="/tree-line"> Tree Line </router-link>
            </li>
        </template>
    </MainLayout>
</template>
