# Observatory

The observatory is a collection of tools designed to inspect the universe.

## Setup

1. Install dependencies: `npm install`

## Development

There are some conveniance scripts for development. Use them to you advantage:

-   `npm run build` is just another name for running the `css` command. Designed to compile the css for production use.
-   `npm run css` compiles the scss sources into a css file and writes it to [./assets/css/dist/main.css](./assets/css/dist/main.css)
-   `npm run eslint-{check|autofix}` runs eslint (a js linter) on all source code files. Either the problems are marked or fixed directly
-   `npm run prettier-{check|autofix}` runs prettier (a code formatter) on all source code files. Either the problems are marked or fixed directly
-   `npm run server` starts a development server on [localhost:3000](localhost:3000)
-   `npm run watch` watches for code changes and recompiles the css automatically on any css or html change
-   `npm run start` is a conveniance command that runs `watch` and `server` in parallel
-   `npm run test` uses the check methods for eslint and prettier as tests
