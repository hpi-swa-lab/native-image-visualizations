# Causality Query

This piece of software parses data exported by CausalityExport and runs some graph simulations on it. These include:

1. After removing a set of causality nodes from the graph, which ones are still reachable?
2. Given a node is still reachable, what other nodes made it reachable?

It can either be run as a native CLI application or integrated in a web-based visualization through WebAssembly.

## Getting started

### native

This is only useful for manual testing!

1. Install cmake (e.g. `apt install cmake`)
2. Install C compiler toolchain (e.g. `apt install gcc`)
3. Build the cmake project
```bash
mkdir native/build
cd native/build
cmake .. && make
```
4. launch. E.g.
```bash
cd <path to directory with causality export files>
<path to causality-query executable>/causality-query benchmark
```


### web

1. Make sure cmake is installed (e.g. `apt install cmake`)
2. Install the [emsdk](https://github.com/emscripten-core/emsdk)
3. Build the cmake project

```bash
mkdir web/build
cd web/build
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release && make
```
4. Copy the resulting files
```
causality-query.js
causality-query.wasm
```
to the webapp (i.e. `/observatory/src/ts/Causality/lib/`)