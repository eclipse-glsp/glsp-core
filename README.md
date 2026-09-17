# Eclipse GLSP - Core [![CI](https://github.com/eclipse-glsp/glsp-core/actions/workflows/ci.yml/badge.svg)](https://github.com/eclipse-glsp/glsp-core/actions/workflows/ci.yml) [![CodeQL](https://github.com/eclipse-glsp/glsp-core/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/eclipse-glsp/glsp-core/actions/workflows/codeql-analysis.yml)

The core framework of the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp): a web-based diagram client framework (based on [Eclipse Sprotty](https://github.com/eclipse/sprotty)) and a TypeScript/Node-based server framework, together with the shared protocol, common development tooling, and the Workflow diagram examples.

This monorepo consolidated the formerly separate [`glsp-client`](https://github.com/eclipse-glsp/glsp-client), [`glsp-server-node`](https://github.com/eclipse-glsp/glsp-server-node), [`glsp`](https://github.com/eclipse-glsp/glsp) (dev-packages), and [`glsp-playwright`](https://github.com/eclipse-glsp/glsp-playwright) repositories into a single, self-bootstrapping pnpm workspace.

> [!NOTE]
> The consolidation is complete. The first consolidated release will be `2.9.0`; all releases up to and including `2.8.0`
> were published from the former repositories linked above. `glsp-client`, `glsp-server-node` and `glsp-playwright`
> are deprecated and will be archived. The [`glsp`](https://github.com/eclipse-glsp/glsp) umbrella repository stays
> in place as the home of issues, discussions and the cross-component documentation; only its dev-packages moved here.

## Structure

The workspace is organized into the following groups:

### `packages/common`: shared between client and server

- [`@eclipse-glsp/protocol`](packages/common/protocol): Generic client-server communication protocol

### `packages/client`: web-based diagram client

- [`@eclipse-glsp/sprotty`](packages/client/glsp-sprotty): Sprotty integration layer providing base bindings and re-exports
- [`@eclipse-glsp/client`](packages/client/client): Sprotty-based GLSP client

### `packages/server`: TypeScript/Node server

- [`@eclipse-glsp/graph`](packages/server/graph): TypeScript-based implementation of the graphical model used in GLSP (GModel)
- [`@eclipse-glsp/server`](packages/server/server): Base framework for building GLSP servers
- [`@eclipse-glsp/layout-elk`](packages/server/layout-elk): ELK-based automatic layout
- [`@eclipse-glsp/server-mcp`](packages/server/server-mcp): Model Context Protocol (MCP) integration for GLSP servers

The server targets Node, but every component is isomorphic and also provides a browser entrypoint, for example to run the server in a web worker.

### `dev-packages`: shared development tooling

- [`@eclipse-glsp/cli`](dev-packages/cli): Helpful scripts and commands for developing GLSP components and release engineering
- [`@eclipse-glsp/config`](dev-packages/config), [`@eclipse-glsp/config-test`](dev-packages/config-test), [`@eclipse-glsp/dev`](dev-packages/dev): Shared TypeScript, oxlint, oxfmt, and test configuration meta-packages
- [`@eclipse-glsp/ts-config`](dev-packages/ts-config), [`@eclipse-glsp/oxlint-config`](dev-packages/oxlint-config), [`@eclipse-glsp/oxfmt-config`](dev-packages/oxfmt-config), [`@eclipse-glsp/vitest-config`](dev-packages/vitest-config): The individual shared configurations

These dev-packages provide every build, test and lint tool this repository uses. glsp-core bootstraps itself.

### `examples`: Workflow diagram example

- [`@eclipse-glsp-examples/workflow-glsp`](examples/workflow-glsp) and [`workflow-standalone`](examples/workflow-standalone): Workflow client customizations and the standalone example application (Node & Browser mode)
- [`@eclipse-glsp-examples/workflow-server`](examples/workflow-server) and the bundled/MCP-demo variants: Workflow GLSP example server

### `e2e`: Playwright-based end-to-end testing

- [`@eclipse-glsp/playwright`](e2e/playwright): Playwright-based testing framework for GLSP diagram editors (page objects, interaction flows, integration API)
- [`@eclipse-glsp-examples/workflow-e2e`](e2e/workflow-e2e): Page objects and reusable test suites for the Workflow example, plus the standalone end-to-end tests of this repository

The Theia and VS Code integrations of the framework are tested in [`glsp-theia-integration`](https://github.com/eclipse-glsp/glsp-theia-integration) and [`glsp-vscode-integration`](https://github.com/eclipse-glsp/glsp-vscode-integration), which reuse the suites from `@eclipse-glsp-examples/workflow-e2e`.

## Getting started

If you want to build a diagram editor with GLSP, start with the [GLSP getting started guide](https://www.eclipse.org/glsp/documentation/gettingstarted) on the project website.
The two entry packages of this repository are [`@eclipse-glsp/client`](https://www.npmjs.com/package/@eclipse-glsp/client) for the diagram client and [`@eclipse-glsp/server`](https://www.npmjs.com/package/@eclipse-glsp/server) for the TypeScript/Node server; everything else is either a dependency of these two, optional tooling, or example code.

## Releases and published packages

Starting with `2.9.0`, all packages of this repository are released together and the release notes are published as [GitHub releases of `eclipse-glsp/glsp-core`](https://github.com/eclipse-glsp/glsp-core/releases).
Releases up to and including `2.8.0` were published from the former repositories (see the note at the top).

The workspace publishes the following packages to npm, grouped as in [Structure](#structure):

- `packages/common`: [`@eclipse-glsp/protocol`](https://www.npmjs.com/package/@eclipse-glsp/protocol)
- `packages/client`: [`@eclipse-glsp/sprotty`](https://www.npmjs.com/package/@eclipse-glsp/sprotty), [`@eclipse-glsp/client`](https://www.npmjs.com/package/@eclipse-glsp/client)
- `packages/server`: [`@eclipse-glsp/graph`](https://www.npmjs.com/package/@eclipse-glsp/graph), [`@eclipse-glsp/server`](https://www.npmjs.com/package/@eclipse-glsp/server), [`@eclipse-glsp/layout-elk`](https://www.npmjs.com/package/@eclipse-glsp/layout-elk), [`@eclipse-glsp/server-mcp`](https://www.npmjs.com/package/@eclipse-glsp/server-mcp)
- `dev-packages`: [`@eclipse-glsp/cli`](https://www.npmjs.com/package/@eclipse-glsp/cli), [`@eclipse-glsp/dev`](https://www.npmjs.com/package/@eclipse-glsp/dev), [`@eclipse-glsp/config`](https://www.npmjs.com/package/@eclipse-glsp/config), [`@eclipse-glsp/config-test`](https://www.npmjs.com/package/@eclipse-glsp/config-test), [`@eclipse-glsp/ts-config`](https://www.npmjs.com/package/@eclipse-glsp/ts-config), [`@eclipse-glsp/oxlint-config`](https://www.npmjs.com/package/@eclipse-glsp/oxlint-config), [`@eclipse-glsp/oxfmt-config`](https://www.npmjs.com/package/@eclipse-glsp/oxfmt-config), [`@eclipse-glsp/vitest-config`](https://www.npmjs.com/package/@eclipse-glsp/vitest-config)
- `examples`: [`@eclipse-glsp-examples/workflow-glsp`](https://www.npmjs.com/package/@eclipse-glsp-examples/workflow-glsp), [`@eclipse-glsp-examples/workflow-server`](https://www.npmjs.com/package/@eclipse-glsp-examples/workflow-server), [`@eclipse-glsp-examples/workflow-server-bundled`](https://www.npmjs.com/package/@eclipse-glsp-examples/workflow-server-bundled)
- `e2e`: [`@eclipse-glsp/playwright`](https://www.npmjs.com/package/@eclipse-glsp/playwright), [`@eclipse-glsp-examples/workflow-e2e`](https://www.npmjs.com/package/@eclipse-glsp-examples/workflow-e2e)

The standalone example application, the bundled web server and the MCP demo are workspace-private and are not published.
Unreleased development builds of every published package are available under the `next` dist-tag.

## Developer documentation

### First time setup

- Install [node.js](https://nodejs.org/) (requires Node v24+)
- Install pnpm: <https://pnpm.io/installation> (use pnpm 12+); a recent pnpm automatically switches to the version pinned in the `packageManager` field
- Clone this repository
- Install dependencies: `pnpm i` or `pnpm i --frozen-lockfile`

### Build and testing

- Build (all packages): `pnpm build`
- Test (all packages): `pnpm test`
- End-to-end tests (Playwright, requires a prior build): `pnpm test:e2e`, see the [`e2e/workflow-e2e` README](e2e/workflow-e2e/README.md)
- Lint (all packages): `pnpm lint`
- Check license headers: `pnpm headers:check`
- Clean (all packages): `pnpm clean`
- Full validation (build + lint + format + headers + test): `pnpm check:all`
- Auto-fix lint/format/headers: `pnpm fix:all`

### Toolchain

- **TypeScript 7** (`tsc -b`) compiles the workspace; the shared [`@eclipse-glsp/ts-config`](dev-packages/ts-config) uses `moduleResolution: bundler` with CommonJS output and requires TypeScript 6 or newer.
- **oxlint** lints from the root only (`pnpm lint`); the rule set lives in [`@eclipse-glsp/oxlint-config`](dev-packages/oxlint-config) and the repository-specific import restrictions in `oxlint.config.mts`. Type-aware rules and the type check (`typeCheck`, via `oxlint-tsgolint`) resolve workspace packages to their sources through the tsconfig project references, so `pnpm lint` needs no prior build and also reports TypeScript compiler diagnostics.
- **oxfmt** formats all sources, JSON, YAML, CSS and Markdown (`pnpm format`); the options live in [`@eclipse-glsp/oxfmt-config`](dev-packages/oxfmt-config) and are spread in `oxfmt.config.mts`.

#### Editor support

Both extensions this workspace relies on are recommended in `.vscode/extensions.json`:

- The [Oxc VS Code extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) provides lint diagnostics and format-on-save from the workspace `oxlint` and `oxfmt` binaries.
- The [TypeScript Native Preview extension](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview) provides the language features (completions, go-to-definition, diagnostics) for TypeScript 7. The workspace enables it via `js/ts.experimental.useTsgo`; without the extension installed, that setting has no effect and VS Code falls back to its built-in TypeScript support. The extension ships its own `tsgo` build, which may lag behind the workspace compiler — the TypeScript 7 npm package contains the native compiler without a `tsserver`, so `js/ts.tsdk.path` cannot point at the workspace install. Type checking against the exact compiler version happens in `pnpm build` and `pnpm lint`.

### GLSP CLI

The `glsp` command from [`@eclipse-glsp/cli`](dev-packages/cli) provides repo-level tooling: license-header checks, index generation, dependency-ordered and multi-repo management, and release engineering. Several root scripts such as `headers:check` and `publish:next` delegate to it. See the [`@eclipse-glsp/cli` README](dev-packages/cli/README.md) for the full command reference.

## Workflow diagram example

> **[Try it online](https://eclipse-glsp.github.io/glsp-previews/glsp-core/main/diagram.html)**, a live deployment of the browser example running on GitHub Pages.

The workflow diagram is a consistent example provided by all GLSP components. It implements a simple flow chart diagram editor with different types of nodes and edges. The example can be used to try out different GLSP features, as well as several available integrations with IDE platforms (Theia, VSCode, Eclipse, Standalone). As the example is fully open source, you can also use it as a blueprint for a custom implementation of a GLSP diagram editor. See [our project website](https://www.eclipse.org/glsp/documentation/#workflowoverview) for an overview.

### How to start the Workflow diagram example

After `pnpm build`, the standalone example can be run in two modes:

- **Node mode.** The client connects to a GLSP server over WebSocket. The example server is part of this workspace and starts automatically, so no extra setup is needed.

    ```bash
    pnpm dev              # watch client + start the example server + dev server
    pnpm standalone start # serve a production build against the example server
    ```

- **Browser mode.** The GLSP server runs as a Web Worker directly in the browser. No external server process is needed.

    ```bash
    pnpm dev:browser                 # watch sources + dev server
    pnpm standalone start:browser    # serve a production build
    ```

You can also start the example server on its own, over WebSocket (default) or socket:

```bash
pnpm server dev           # watch mode, WebSocket (port 8081)
pnpm server start         # run the built bundle, WebSocket (port 8081)
pnpm server dev:socket    # watch mode, socket (port 5007)
pnpm server start:socket  # run the built bundle, socket (port 5007)
```

### Using an external server

To run the client against a GLSP server you start yourself, for example the [Java-based workflow server](https://github.com/eclipse-glsp/glsp-server#workflow-diagram-example) listening on `ws://localhost:8081/workflow`, launch only the client with a bare `--external-server`. No built-in server is started:

```bash
pnpm dev --external-server              # watch client only, connect to your running server
pnpm standalone start --external-server # serve the built client only, connect to your running server
```

See the [`workflow-standalone` README](examples/workflow-standalone/README.md) for all `start`/`dev` flags.

### MCP demo

> **[Try it online](https://eclipse-glsp.github.io/glsp-previews/glsp-core/main/mcp-demo/)**, deployed to GitHub Pages alongside the browser example.

The workflow example also ships a small demo that drives a GLSP diagram over the [Model Context Protocol](https://modelcontextprotocol.io) (MCP). It runs a GLSP server in the browser and exposes it as MCP tools that an AI client can call. See the [`workflow-server-mcp-demo` README](examples/workflow-server-mcp-demo/README.md) for how to run it and what it exercises.

## Deployment

GitHub Pages serves both browser demos from the separate [`glsp-previews`](https://github.com/eclipse-glsp/glsp-previews) repository, under `glsp-core/`:

| Demo             | `main`                                                                     | Pull request                                         |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Workflow diagram | <https://eclipse-glsp.github.io/glsp-previews/glsp-core/main/diagram.html> | `.../glsp-core/pr-previews/pr-<number>/diagram.html` |
| MCP demo         | <https://eclipse-glsp.github.io/glsp-previews/glsp-core/main/mcp-demo/>    | `.../glsp-core/pr-previews/pr-<number>/mcp-demo/`    |

`pnpm bundle:site` builds both demos and collects them in `dist-site/`. The deploy workflows publish that directory. A pull request gets its own preview unless it only changes Markdown files, `LICENSE` or `.vscode/`. The CI workflow uses the same filter. A comment on the pull request tracks the deployment and links both demos next to their current `main` counterpart. Closing the pull request removes the preview.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).

## Contributing and license

- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute, sign the Eclipse Contributor Agreement, and the branch and commit message conventions
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): the code of conduct all participants are expected to follow
- [SECURITY.md](SECURITY.md): how to report a security vulnerability (never via a public issue or pull request)
- [LICENSE](LICENSE): all packages are licensed under `(EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0)`

Issues are not tracked in this repository: bugs and feature requests for all GLSP components are reported in the [GLSP umbrella repository](https://github.com/eclipse-glsp/glsp/issues).
