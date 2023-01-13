# Observatory

The observatory is a collection of tools designed to inspect GraalVM Native Images, also called Universes.

## Setup

1. Install Node & npm ( see https://docs.npmjs.com/downloading-and-installing-node-js-and-npm )
2. Go to the root directory of the project containing `package.json` and install dependencies: `npm install`

## Development

<!-- TODO: update available commands -->

There are some conveniance scripts for development. Use them to you advantage:

-   `npm run build` is a convenience command that runs `bundle` and `css`
-   `npm run clean-build` runs `clean` before `build`
-   `npm run bundle` transpiles and bundles typescript files to [assets/js/dist/observatory.umd.js](./assets/js/dist/observatory.umd.js)
-   `npm run css` compiles the scss sources into a css file and writes it to [assets/css/dist/main.css](./assets/css/dist/main.css)
-   `npm run clean` removes `assets/css/dist`, `assets/js/dist` and any containing files
-   `npm run eslint-{check|autofix}` runs eslint (a js linter) on all source code files. Either the problems are marked or fixed directly
-   `npm run prettier-{check|autofix}` runs prettier (a code formatter) on all source code files. Either the problems are marked or fixed directly
-   `npm run server` starts a development server on [localhost:8080](localhost:8080)
-   `npm run watch` watches for code changes and builds automatically on any css, html, js or ts changes in `assets/**/src/*`
-   `npm run start` is a convenience command that runs `watch` and `server` in parallel
-   `npm run test` uses the check methods for eslint and prettier as tests

---

<!-- TODO: check what we need here: -->

# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

-   [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Type Support For `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.
