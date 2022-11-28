# Observatory

The observatory is a collection of tools designed to inspect GraalVM Native Images, also called Universes.

## Setup

1. Install Node & npm ( see https://docs.npmjs.com/downloading-and-installing-node-js-and-npm ) 
2. Go to the root directory of the project containing `package.json` and install dependencies: `npm install`

## Development

There are some conveniance scripts for development. Use them to you advantage:

-   `npm run build` is a convenience command that runs `build-js` and `css`
-   `npm run build-js` transpiles and bundles typescript files to [./assets/js/dist/](./assets/css/dist/)
-   `npm run css` compiles the scss sources into a css file and writes it to [./assets/css/dist/main.css](./assets/css/dist/main.css)
-   `npm run clean` removes any files in [./assets/js/dist/](./assets/css/dist/)
-   `npm run eslint-{check|autofix}` runs eslint (a js linter) on all source code files. Either the problems are marked or fixed directly
-   `npm run prettier-{check|autofix}` runs prettier (a code formatter) on all source code files. Either the problems are marked or fixed directly
-   `npm run server` starts a development server on [localhost:8080](localhost:8080)
-   `npm run watch` watches for code changes and builds automatically on any css, html, js or ts changes in `assets/**/src/*`
-   `npm run start` is a convenience command that runs `watch` and `server` in parallel
-   `npm run test` uses the check methods for eslint and prettier as tests