# 💧EPANET-JS

<img src="https://storage.googleapis.com/model-create-static/epanetjs.jpeg" alt="placeholder" height="350" align="right"/>

Water distribution network modelling, either in the browser or with Node. Uses OWA-EPANET v2.2 toolkit compiled to Javascript.

> **Note**: All version before 1.0.0 should be considered beta with potential breaking changes between releases, use in production with caution.

[![CI](https://github.com/modelcreate/epanet-js/workflows/CI/badge.svg)](https://github.com/modelcreate/epanet-js/actions?query=workflow%3ACI) [![codecov](https://codecov.io/gh/modelcreate/epanet-js/branch/master/graph/badge.svg)](https://codecov.io/gh/modelcreate/epanet-js) ![npm](https://img.shields.io/npm/v/epanet-js) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)

<p align="center">
  <a href="#install">Install</a> •
  <a href="#usage">Usage</a> •
  <a href="#about">About</a> •
  <a href="https://github.com/modelcreate/epanet-js/wiki/Examples">Examples</a> •
  <a href="#featured-apps">Featured Apps</a> •
  <a href="#build">Build</a> •
  <a href="#api">API</a> •
  <a href="#license">License</a>
</p>

## Install

Use npm to install the latest stable version

```
$ npm install epanet-js
```

## Usage

### Load and run an existing inp File

[Run this example on CodeSandbox](https://codesandbox.io/embed/musing-chandrasekhar-7tp1y?fontsize=14&hidenavigation=1&module=%2Fsrc%2Findex.js&theme=dark)

```js
import { Project, Workspace } from "epanet-js";
import fs from "fs";

// Read an existing inp file from your local disk
const net1 = fs.readFileSync("net1.inp");

// Initialise a new Workspace and Project object
// Requires top-level await support or execution within an async function
const ws = new Workspace();
await ws.loadModule(); // Asynchronous
const model = new Project(ws);

// Write a copy of the inp file to the virtual workspace
ws.writeFile("net1.inp", net1);

// Runs toolkit methods: EN_open, EN_solveH & EN_close
model.open("net1.inp", "report.rpt", "out.bin");
model.solveH();
model.close();
```

**_More Examples_**

- [Step through the hydraulic simulation](https://github.com/modelcreate/epanet-js/wiki/Examples#step-through-the-hydraulic-simulation)
- [New model builder API](https://github.com/modelcreate/epanet-js/wiki/Examples#new-model-builder-api)
- [Fire Flow Analysis using React](https://github.com/modelcreate/epanet-js/wiki/Examples#fire-flow-analysis---react-example)
- [Float valves using React Code (WIP)](https://github.com/modelcreate/epanet-js-float-valve-example) - [Demo](https://modelcreate.github.io/epanet-js-float-valve-example/)

## About

Engineers use hydraulic modelling software to simulate water networks. A model will represent a network consisting of pipes, pumps, valves and storage tanks. The modelling software tracks the flow of water in each pipe, the pressure at each node, the height of water in each tank throughout the network during a multi-period simulation.

EPANET is an industry-standard program, initially developed by the USEPA, to simulate water distribution networks, its source code was released in the public domain. An open-source fork by the Open Water Analytics (OWA) community maintains and extends its original capabilities. Read more about [EPANET on Wikipedia](https://en.wikipedia.org/wiki/EPANET) and the [OWA community on their website](http://wateranalytics.org/).

The EPANET Toolkit is an API written in C that allows developers to embed the EPANET's engine in their own applications.

Epanet-js is a full port of version 2.2 OWA-EPANET Toolkit in Typescript, providing access to all 122 functions within the toolkit.

The JavaScript library is for engineers, developers and academics to run and share hydraulic analyses or create custom front end or server-side applications.

### Roadmap

Reaching version 1.0.0 is the current focus, the first non-beta version will have API stability, full test coverage and have mirrored functions of each method in the EPANET Toolkit.

See the remaining task on the [Version 1.0.0 Project](https://github.com/modelcreate/epanet-js/projects/1).

### Using EPANET 2.3 with epanet-js

EPANET 2.3 is currently under development, you can access the latest version of the toolkit within epanet-js by [setting an override](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides) in your package.json.

Versions of the `epanet-engine` compile against the dev branch of owa-epanet are tagged as next, find the [latest version in npm](https://www.npmjs.com/package/@model-create/epanet-engine).

```
"overrides": {
    "epanet-js": {
      "@model-create/epanet-engine": "0.6.4-beta.0"
    }
  }
```

## Featured Apps

<img src="https://user-images.githubusercontent.com/6113153/162494373-5705c9ea-2ded-49d8-8996-c94fa646fe33.gif" alt="placeholder"  align="right"/>

### Qatium

Qatium is an open and collaborative water management platform, allowing users to run operational scenarios and near-real time simulations using their hydraulic models in the browser.

With an intuitive interface, Qatium provides access to operational hydraulic modelling to those focused on running a water distribution network.

**Website**: [Qatium](https://qatium.com/)

<br clear="right"/>

##

<img src="https://user-images.githubusercontent.com/6113153/162494849-c4b965ca-9f69-4d9b-92b4-26d3788b061b.gif" alt="placeholder"  align="right"/>

### Watermain Shutdown

Investigate the impact of shutdowns within a water network. Select a pipe, find the isolation valves, the customers impacted, and any alternative supplies, all with one click.

Epanet-js is used to confirm the impact on the network and ensuring alternative supplies are adequate.

Only key information is displayed. Is there low or high pressure, and are there water quality issues to be aware of, such as velocity increases or flow reversals.

**Website**: [Watermain Shutdown](https://shutdown.modelcreate.com/)

**Source Code**: [GitHub](https://github.com/modelcreate/watermain-shutdown)

<br clear="right"/>

##

<a href="https://calibrate.modelcreate.com/"><img src="https://raw.githubusercontent.com/modelcreate/model-calibrate/master/img/app.png" alt="Model View" height="175" align="right"/></a>

### Model Calibrate

Extract subsections of your InfoWorks WS Pro models and run them in your browser. As you make calibration changes such as modifying roughness or restriction valves the application runs an epanet model and compares the simulated results to those observered in the field.

**Website**: [Model Calibrate](https://calibrate.modelcreate.com/)

**Source Code**: [GitHub](https://github.com/modelcreate/model-calibrate)

<br clear="right"/>

##

<a href="https://view.modelcreate.com/"><img src="https://raw.githubusercontent.com/modelcreate/model-view/master/ModelViewPreview.gif" alt="Model View" height="175" align="right"/></a>

### Model View

Display models created in EPANET directly in the browser. No data leaves your computer; all data rendered and processed locally using the epanet-js library.

**Website**: [Model View](https://view.modelcreate.com/)

**Source Code**: [GitHub](https://github.com/modelcreate/model-view)

<br clear="right"/>

## Build

epanet-js is split into two packages, the epanet-engine package which compiles the original C code into WASM using Emscripten. And epanet-js is a TypeScript library which wraps over the generated module from Emscripten and manages memory allocation, error handling and returning of varaible.

**Building epanet-engine**

Run the command `pnpm run build` to creates a docker container of Emscripten and the compiled OWA-EPANET source code and generate types.

```sh
cd packages/epanet-engine
pnpm run build
```

**Building epanet-js**

You must first build epanet-engine before you can test or build epanet-js.

```sh
cd packages/epanet-js
pnpm run test
pnpm run build
```

**Publishing epanet-js**

`sh
pnpm publish --dry-run --recursive
pnpm publish --recursive
`

## API

> [Find the full API on the epanet-js website](https://epanetjs.com/api/)

epanet-js contains two classes, Workspace & Project. A Workspace represents a virtual file system where you can store and read files that are consumed by the tool kit, such as [INP Files](http://wateranalytics.org/EPANET/_inp_file.html) or generated by it, such as [RPT files](http://wateranalytics.org/EPANET/_rpt_file.html) or [OUT files](http://wateranalytics.org/EPANET/_out_file.html).

A Project is a single instance of the EN_Project wrapper object and a singleton with all 122 toolkit methods attached. A [full list of all methods](https://epanetjs.com/api/project/) can be found on the epanet-js website. All method names have been converted to camelCase to keep with javascript convention.

Create a `Project` object by instancing the <a href="https://epanetjs.com/api/project/" target="_blank"><code>Project</code></a> class with a <a href="https://epanetjs.com/api/workspace/" target="_blank"><code>Workspace</code></a> object.

```javascript
import { Project, Workspace } from `epanet-js`

// Requires top-level await support or execution within an async function
const ws = new Workspace;
await ws.loadModule(); // Asynchronous
const model = new Project(ws)
```

## License

Both epanet-js and @model-create/epanet-engine are [MIT licenced](https://github.com/modelcreate/epanet-js/blob/master/LICENSE).

The hydraulic engine used within the epanet-js library is [OWA-EPANET 2.2](https://github.com/OpenWaterAnalytics/EPANET), which is [MIT licenced](https://github.com/OpenWaterAnalytics/EPANET/blob/dev/LICENSE), with contributions by the following [authors](https://github.com/OpenWaterAnalytics/EPANET/blob/dev/AUTHORS).
