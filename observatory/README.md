# Observatory

The observatory is a collection of tools designed to inspect GraalVM Native Images, also called Universes.

## Setup

1. Install Node & npm ( see https://docs.npmjs.com/downloading-and-installing-node-js-and-npm )
2. Go to the root directory of the project containing `package.json` and install dependencies: `npm ci`
3. You're good to go

## IDE Setup

For VSCode the extensions [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) are recommended by vite.

## Development

As we use vite for development, there is some conveniance that comes with it. Have a look at [this stackoverflow thread](https://stackoverflow.com/questions/71703933/what-is-the-difference-between-vite-and-vite-preview) for more information. In short:

-   `npm run dev` sstarts a local web server with hot module reloading for development.
-   `npm run build` builds the project and outputs it to the folder ./dist
-   `npm run preview` starts a local webserver that serves the version in ./dist

For linting and prettifying there also also commands:

-   `npm run eslint-{check|autofix}` runs eslint with the project configuration. If autofix is used, it will try to solve the problems itself.
-   `npm run prettier-{check|autofix}` runs prettier with the project configuration. If autofix is used, it will reformat all files managed by prettier.
-   `npm run test` is a conveniance script that runs both `eslint-check` and `prettier-check`. Mainly used in CI-Pipelines

## Other information

### Vite

If you did not work with vite before, have a look at the [documentation](https://vitejs.dev/) and the [getting started guide](https://vitejs.dev/guide/).

### Type Support For `.vue` Imports in TS

(from the vite project template)

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.
