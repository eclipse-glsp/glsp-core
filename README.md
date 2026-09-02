# Eclipse GLSP - Core

The core framework of the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp): a web-based diagram client framework (based on [Eclipse Sprotty](https://github.com/eclipse/sprotty)) and a TypeScript/Node-based server framework, together with the shared protocol, common development tooling, and the Workflow diagram examples.

This monorepo consolidates the formerly separate `glsp-client`, `glsp-server-node`, and `glsp` (dev-packages) repositories into a single, self-bootstrapping pnpm workspace.

> [!WARNING]
> **Migration in progress** — the consolidation of the formerly separate
> [`glsp-client`](https://github.com/eclipse-glsp/glsp-client),
> [`glsp-server-node`](https://github.com/eclipse-glsp/glsp-server-node) and
> [`glsp`](https://github.com/eclipse-glsp/glsp) repositories into this monorepo is currently underway.
> This repository is **not ready for use yet** — please continue to use the original repositories
> until the first consolidated release is published from here.

## Structure

The workspace is organized into the following groups:

### `packages/common` — shared between client and server

- [`@eclipse-glsp/protocol`](packages/common/protocol): Generic client-server communication protocol

### `packages/client` — web-based diagram client

- [`@eclipse-glsp/sprotty`](packages/client/glsp-sprotty): Sprotty integration layer providing base bindings and re-exports
- [`@eclipse-glsp/client`](packages/client/client): Sprotty-based GLSP client

### `packages/server` — TypeScript/Node server

- [`@eclipse-glsp/graph`](packages/server/graph): TypeScript-based implementation of the graphical model used in GLSP (GModel)
- [`@eclipse-glsp/server`](packages/server/server): Base framework for building GLSP servers
- [`@eclipse-glsp/layout-elk`](packages/server/layout-elk): ELK-based automatic layout
- [`@eclipse-glsp/server-mcp`](packages/server/server-mcp): Model Context Protocol (MCP) integration for GLSP servers

The server's main target environment is Node, but all components are implemented in an isomorphic fashion and also provide an entrypoint to target browser environments (e.g. running the server in a web worker).

### `dev-packages` — shared development tooling

- [`@eclipse-glsp/cli`](dev-packages/cli): Helpful scripts and commands for developing GLSP components and release engineering
- [`@eclipse-glsp/config`](dev-packages/config), [`@eclipse-glsp/config-test`](dev-packages/config-test), [`@eclipse-glsp/dev`](dev-packages/dev): Shared TypeScript, ESLint, Prettier, and test configuration meta-packages
- [`@eclipse-glsp/ts-config`](dev-packages/ts-config), [`@eclipse-glsp/eslint-config`](dev-packages/eslint-config), [`@eclipse-glsp/prettier-config`](dev-packages/prettier-config), [`@eclipse-glsp/vitest-config`](dev-packages/vitest-config): The individual shared configurations

These dev-packages provide all build/test/lint tooling consumed in this repository — glsp-core is fully self-bootstrapping.

### `examples` — Workflow diagram example

- [`@eclipse-glsp-examples/workflow-glsp`](examples/workflow-glsp) and [`workflow-standalone`](examples/workflow-standalone): Workflow client customizations and the standalone example application (Node & Browser mode)
- [`@eclipse-glsp-examples/workflow-server`](examples/workflow-server) and the bundled/MCP-demo variants: Workflow GLSP example server

## Developer Documentation

### First time setup

- Install [node.js](https://nodejs.org/) (requires Node v22.18+)
- Install pnpm: <https://pnpm.io/installation> (use pnpm 11+); a recent pnpm automatically switches to the version pinned in the `packageManager` field
- Clone this repository
- Install dependencies: `pnpm i` or `pnpm i --frozen-lockfile`

### Build & Testing

- Build (all packages): `pnpm build`
- Test (all packages): `pnpm test`
- Lint (all packages): `pnpm lint`
- Check license headers: `pnpm headers:check`
- Clean (all packages): `pnpm clean`
- Full validation (build + lint + format + headers + test): `pnpm check:all`
- Auto-fix lint/format/headers: `pnpm fix:all`

### GLSP CLI

The `glsp` command from [`@eclipse-glsp/cli`](dev-packages/cli) provides repo-level tooling — license-header checks, index generation, dependency-ordered and multi-repo management, and release engineering. Several root scripts (`headers:check`, `publish:next`, …) delegate to it. See the [`@eclipse-glsp/cli` README](dev-packages/cli/README.md) for the full command reference.

## Workflow Diagram Example

> **[Try it online](https://eclipse-glsp.github.io/glsp-client/diagram.html)** – a live deployment of the browser example running on GitHub Pages.

The workflow diagram is a consistent example provided by all GLSP components. It implements a simple flow chart diagram editor with different types of nodes and edges. The example can be used to try out different GLSP features, as well as several available integrations with IDE platforms (Theia, VSCode, Eclipse, Standalone). As the example is fully open source, you can also use it as a blueprint for a custom implementation of a GLSP diagram editor. See [our project website](https://www.eclipse.org/glsp/documentation/#workflowoverview) for an overview.

### How to start the Workflow Diagram example

After `pnpm build`, the standalone example can be run in two modes:

- **Node mode** – The client connects to a GLSP server via WebSocket. The example server is part of this workspace and is started automatically, so no extra setup is needed.

    ```bash
    pnpm dev              # watch client + start the example server + dev server
    pnpm standalone start # serve a production build against the example server
    ```

- **Browser mode** – The GLSP server runs as a Web Worker directly in the browser. No external server process is needed.

    ```bash
    pnpm dev:browser                 # watch sources + dev server
    pnpm standalone start:browser    # serve a production build
    ```

The example server can also be started on its own — WebSocket (default) or socket:

```bash
pnpm server dev           # watch mode, WebSocket (port 8081)
pnpm server start         # run the built bundle, WebSocket (port 8081)
pnpm server dev:socket    # watch mode, socket (port 5007)
pnpm server start:socket  # run the built bundle, socket (port 5007)
```

### Using an external server

To run the client against a GLSP server you start yourself — for example the [Java-based workflow server](https://github.com/eclipse-glsp/glsp-server#workflow-diagram-example) listening on `ws://localhost:8081/workflow` — launch only the client with a bare `--external-server` (no built-in server is started):

```bash
pnpm dev --external-server              # watch client only, connect to your running server
pnpm standalone start --external-server # serve the built client only, connect to your running server
```

See the [`workflow-standalone` README](examples/workflow-standalone/README.md) for all `start`/`dev` flags.

### MCP demo

The workflow example also ships a small demo that drives a GLSP diagram over the [Model Context Protocol](https://modelcontextprotocol.io) (MCP): an in-browser GLSP server exposed as MCP tools that an AI client can call. See the [`workflow-server-mcp-demo` README](examples/workflow-server-mcp-demo/README.md) for how to run it and what it exercises.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
