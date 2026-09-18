# A5 — Layering & dependency direction

Surface swept: the whole workspace — `packages/client/*`, `packages/common/protocol`, `packages/server/*`,
`dev-packages/*`, `examples/*`, `e2e/*` — at package level (`package.json` deps, workspace refs, tsconfig project
references) and at module level (the import graph inside each package).

The repository has **no architecture documentation**: `docs/` did not exist before this review. The intended layering
is therefore inferable only from code, package boundaries and `oxlint.config.mts`, and findings say where the intended
rule is genuinely ambiguous rather than violated.

Every finding below was verified against the source.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A5-1 · The layering rules are warnings; only the generic barrel ban is an error

- **Location:** `oxlint.config.mts:87,113,134,147,162,188,203` — every product-package `no-restricted-imports` override starts with `'warn'`, while `:221` uses `'error'` · base rule at `dev-packages/oxlint-config/oxlintrc.json:62` (`["error", "..", "../index", "../..", "../../index", "src"]`) · the mechanism is stated in the config's own comment at `oxlint.config.mts:20` ("an override replaces the entire rule value") · `package.json:42` (`"lint": "oxlint ."`, no `--deny-warnings`) · `scripts/lint-report.mjs:101` (`process.exit(errors > 0 ? 1 : 0)`)
- **What's wrong:** Because an override replaces the whole rule value, every override that adds a Sprotty/protocol/uuid restriction also _demotes the inherited `error`-level barrel ban to `warn`_ in that package — so the Sprotty seam, the protocol boundary and the barrel ban are all non-blocking, and a new `import … from 'sprotty'` inside `packages/client/client` leaves both `pnpm lint` and `pnpm lint:ci` green.
- **Direction:** Make the overrides `'error'`, or drop the severity re-declaration so the base severity is inherited.
- **Size:** S

### A5-2 · Nothing checks the `common/` / `node/` / `browser/` split, and `common/` already imports `net`

- **Location:** `packages/server/server/src/common/launch/jsonrpc-server-launcher.ts:27` (`import * as net from 'net'`) · exported by `packages/server/server/src/common/index.ts:84` · reachable from `packages/server/server/src/browser/reexport.ts:16` → `browser/index.ts:19`
- **What's wrong:** A Node-socket launcher lives in `common/` and is re-exported from the browser entry point. The web-worker bundle contains `JsonRpcGLSPServerLauncher` and avoids a broken build only because every `net.*` use sits in a type position — one value-level use (`net.isIP`, constructing a `net.Server`) would break `pnpm bundle:browser` with no earlier signal.
- **Direction:** Move the socket launcher to `node/` and keep only the transport-agnostic base in `common/`, or add a lint/bundle check that fails when a `common/` module reaches a Node builtin.
- **Size:** M

### A5-3 · `@eclipse-glsp/protocol` is a protocol package, a DI toolkit and a browser transport in one flat barrel

- **Location:** `packages/common/protocol/src/client-server-protocol/jsonrpc/worker-connection-provider.ts:16` (`vscode-jsonrpc/browser`, `new Worker(url)`) · `websocket-connection.ts:47` (`wrap(socket: WebSocket)`) · `packages/common/protocol/src/di/` (8 inversify modules) · all surfaced through `packages/common/protocol/src/index.ts:44-45,50`
- **What's wrong:** The one package both sides share has no `common`/`browser`/`node` split — unlike `@eclipse-glsp/server`, which does — so the Node server's `common/reexport.ts:18` re-exports `GLSPWebWorkerProvider`, and every Node consumer inherits browser-global-typed API from the wire protocol.
- **Direction:** Split protocol into the wire contract (actions, schema, types) and the transport/DI adapters, using the same `common`/`browser`/`node` layout the server packages already have.
- **Size:** L

### A5-4 · `Emitter extends jsonrpc.Emitter` makes vscode-jsonrpc's Node entry a value dependency of the whole client

- **Location:** `packages/common/protocol/src/utils/event.ts:16,109` · `packages/common/protocol/src/utils/disposable.ts:16` · consequence at `examples/workflow-standalone/esbuild.js:105` (`external: ['fs', 'net'], // node builtins potentially pulled in by ws`)
- **What's wrong:** The two most-imported utility modules in the protocol — `Disposable` and `Event` — take a _runtime_ dependency on `vscode-jsonrpc`, whose bare specifier resolves to `lib/node/main.js`, so the browser diagram bundle has to externalize Node builtins to build at all.
- **Direction:** Define `Disposable`/`Event`/`Emitter` standalone — they are roughly 20 lines — and confine the jsonrpc types to `client-server-protocol/jsonrpc/`.
- **Size:** M

### A5-5 · `e2e/playwright` is a single 98-module import cycle, created by sibling barrels the lint rule doesn't cover

- **Location:** `oxlint.config.mts:233` (`ownAndParentBarrels(10)` bans only `'.'`, `'..'`, `'../..'`, …) · concrete value cycle: `e2e/playwright/src/glsp/graph/elements/index.ts:16` → `glsp/graph/elements/edge.ts:18` → `glsp/graph/decorators/index.ts:17` → `glsp/graph/decorators/edge.decorator.ts:16` → back to `elements/index.ts`
- **What's wrong:** 98 of 111 modules form one strongly connected component because modules import _sibling_ directory barrels (`../remote` 28×, `../types` 25×, `../extension` 15×, `../graph` 15×) — closing exactly the runtime cycle the rule's own comment says it exists to prevent. `packages/client/client` has no per-directory barrels and no such cycle, so the published Playwright framework is the only package carrying this risk.
- **Direction:** Extend the restriction to any directory barrel — or drop the per-directory `index.ts` files entirely, as the client packages did — and import defining modules directly.
- **Size:** M

### A5-6 · Package entry points are stub files and a non-standard `browser` field, with `main` and `types` disagreeing

- **Location:** `packages/server/server/package.json:48-52` (`"main": "./lib/node/index"`, `"browser": { "lib/node/index": "./lib/browser/index" }`, `"types": "lib/common/index"`) · same shape at `packages/server/server-mcp/package.json:45-49` · subpaths served by root stubs `packages/server/server/node.js`, `browser.js` · no `exports` map in any product package
- **What's wrong:** The `browser` key omits the `./` prefix and the extension the field's convention requires (compare `vscode-jsonrpc`'s `"./lib/node/main.js"`), so it works by esbuild's tolerance rather than by spec; and a bare `@eclipse-glsp/server` import gives a consumer the _node_ runtime with _common-only_ types, a mismatch nothing states.
- **Direction:** Add a real `exports` map with `./node`, `./browser` and `./common` conditions, and drop both the stub files and the legacy `browser` field.
- **Size:** M
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) — the module format is that issue's; the entry-point map is a separate decision that has to be made alongside it.

### A5-7 · The Sprotty seam owns the service identifiers of the layer above it

- **Location:** `packages/client/glsp-sprotty/src/types.ts:25-75` — `TYPES` declares `IChangeBoundsManager`, `IHelperLineManager`, `IGridManager`, `IDebugManager`, `IDiagramExporter`, `IShortcutManager`, `IAutocompleteSuggestionProviderRegistry`, …
- **What's wrong:** Every service defined in `@eclipse-glsp/client` has its identity declared one layer down, in the 8-file Sprotty-adapter package, so adding a client feature means editing the seam. The server keeps its identifiers in the same package as its features (`packages/server/server/src/common/di/service-identifiers.ts`).
- **Direction:** Keep only the Sprotty-augmenting identifiers in the seam and let the client contribute its own through a mergeable `TYPES` extension.
- **Size:** M
- **See also:** [di.md](di.md) A3-8 — the same table, seen as a DI problem.

### A5-8 · `re-decorate.ts` mutates a class from another module as an import side effect

- **Location:** `packages/common/protocol/src/di/re-decorate.ts:22` (`decorate(injectable(), JsonrpcClientProxy);`) · exported from `packages/common/protocol/src/di/index.ts:20`
- **What's wrong:** Importing anything from `protocol/lib/di` — which `glsp-sprotty` and the server both do at barrel level — executes a global `decorate()` on a class defined in `client-server-protocol/jsonrpc/base-jsonrpc-glsp-client.ts`. If two copies of the protocol package are ever loaded (the Theia/VS Code integrations, or deep plus bare imports of the same package), inversify throws on the second application.
- **Direction:** Decorate `JsonrpcClientProxy` at its definition site, or bind it explicitly where it is consumed, rather than by import side effect.
- **Size:** S
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).

### A5-9 · Client `utils/` is a 42-fan-in sink that depends upward on `features/`

- **Location:** `packages/client/client/src/utils/gmodel-util.ts:44` (`import { ResizeHandleLocation } from '../features/change-bounds/model'`, used only at `:352`) · `utils/marker.ts:17` → `features/validation` · `utils/layout-utils.ts:17` → `features/change-bounds`
- **What's wrong:** The lowest-level utility module — imported by 42 modules and importing nothing else — reaches up into three feature directories, producing the `utils ↔ features/change-bounds ↔ base/feedback` cycle (`features/change-bounds/model.ts:29-30`, `base/feedback/css-feedback.ts:18`) and making `utils` un-extractable.
- **Direction:** Move the three types that cause the upward edges (`ResizeHandleLocation`, marker types, layout types) down into `base/` or `model.ts`, leaving `utils` leaf-only.
- **Size:** S

### A5-10 · The server's DI symbol registry imports two feature modules

- **Location:** `packages/server/server/src/common/di/service-identifiers.ts:16-17` → `common/features/directediting/context-edit-validator.ts:18` → `common/features/model/model-state.ts:19` → back to `service-identifiers.ts`
- **What's wrong:** The server's single import cycle exists only so a factory _type alias_ (`ValidateLabelEditAdapterFactory`, `:38`) can be co-located with the symbols, pulling the feature layer into the module 14 others treat as the bottom of the graph.
- **Direction:** Keep `service-identifiers.ts` symbol-only and declare the factory type next to the feature that implements it.
- **Size:** S

### A5-11 · The e2e suites re-declare the client's DOM contract by hand, with no dependency and no check

- **Location:** `e2e/workflow-e2e/src/cursors-css.ts:16-39` vs `packages/client/client/src/base/feedback/css-feedback.ts:75-97` (22 identical string literals) · `e2e/playwright/src/glsp/graph/svg-metadata-api.ts:41-52` vs `packages/client/client/src/features/svg-metadata/metadata-placer.ts:27-40` (`data-svg-metadata-*` written as literals on both sides)
- **What's wrong:** The DOM/CSS contract between the client and the published Playwright framework is a duplicated, untyped protocol that no package boundary, dependency or test ties together — renaming a cursor class in the client breaks e2e only at runtime, in a suite that runs late.
- **Direction:** Publish the DOM contract (cursor classes, metadata attribute names) as a dependency-free module both sides import, or add a characterization test asserting the two tables match.
- **Size:** S

### A5-12 · `e2e/workflow-e2e` reaches into `examples/` through a hard-coded relative filesystem path

- **Location:** `e2e/workflow-e2e/configs/webserver.config.ts:32` (`path.resolve(configDir, '..', '..', 'examples', 'workflow-standalone')`), used at `:66` to `pnpm -C` into it
- **What's wrong:** A real build-order dependency from `e2e/` to `examples/workflow-standalone` exists only as a string — not in `package.json`, not in tsconfig references, invisible to `pnpm -r` ordering and to the workspace graph.
- **Direction:** Declare `@eclipse-glsp-examples/workflow-standalone` as a workspace devDependency and resolve its directory from its `package.json` location.
- **Size:** S

### A5-13 · The MCP demo reimplements the protocol in 905 lines of JS that neither lint nor `tsc` sees

- **Location:** `examples/workflow-server-mcp-demo/src/index.js:18` (`const GLSP_PROTOCOL_VERSION = '1.0.0'`), `:27` (a hand-maintained `CLIENT_ACTION_KINDS` list), `:137` · excluded by `oxlint.config.mts:71` (`'**/*.js'`) and absent from the tsconfig `references`
- **What's wrong:** A shipped example hand-codes the GLSP JSON-RPC handshake, the protocol version and the client action-kind registry as untyped literals, outside every static check in the repo — a protocol change in `packages/common/protocol` cannot break it at build time.
- **Direction:** Make it a `.ts` entry in the root project references that imports `@eclipse-glsp/protocol`, so the demo fails to compile when the protocol moves.
- **Size:** M
- **Adjacent to:** [#1743](https://github.com/eclipse-glsp/glsp/issues/1743) — the hard-coded `'1.0.0'` is a second, unmanaged copy of the protocol version that issue makes authoritative.

### A5-14 · Every package's build scripts depend on dev tooling none of them declare

- **Location:** `pnpm-workspace.yaml:29-42` (`publicHoistPattern` covering `@eclipse-glsp/cli`, `rimraf`, `vitest`, `oxlint`, …) · 11 `package.json` files call the `glsp` binary (`packages/server/server/package.json:59`, `packages/client/client/package.json`, `e2e/playwright/package.json`, …) and `rimraf` (`packages/server/graph/package.json:49`) while declaring neither
- **What's wrong:** `@eclipse-glsp/dev` is a root-only devDependency, so `generate:index`, `clean` and `test` in each package resolve their binaries through a hoisting escape hatch — the dev-package → product-package edge is load-bearing and entirely undeclared, and a stricter hoisting setting breaks every package script at once.
- **Direction:** Declare `@eclipse-glsp/dev` (or `@eclipse-glsp/cli` plus `rimraf`) as a devDependency of each package that invokes it, and shrink the hoist list to what genuinely needs root resolution.
- **Size:** S

---

## Recorded elsewhere

- **`@eclipse-glsp/protocol/lib/di` is the de-facto public API but is not in the protocol's barrel** — [api-server.md](api-server.md) A2-1. This lens confirms nine reaching sites and that no package in the workspace has an `exports` map, which is the only thing keeping it legal.
- **`@eclipse-glsp/server` re-exports the entirety of protocol and graph** — [api-server.md](api-server.md) A2-2.
- **`@eclipse-glsp/client` re-exports the whole of Sprotty** — [api-client.md](api-client.md) A1-1.

---

## Appendix — remaining observations

- Gratuitous deep imports into another workspace package's build output: `packages/server/server/src/common/gmodel/gmodel-create-edge-operation-handler.ts:18` imports `GNode` from `@eclipse-glsp/graph/lib/gnode` while line 17 imports its siblings from the barrel; same at `common/utils/registry.ts:16` (`@eclipse-glsp/protocol/lib/utils/array-util`, where `remove` is in the barrel).
- `@eclipse-glsp/sprotty` declares `sprotty-protocol`, `vscode-jsonrpc` and `autocompleter` as runtime dependencies but imports none of them from `src/` — and `sprotty-protocol` is simultaneously lint-forbidden there (`oxlint.config.mts:133-144`).
- `examples/workflow-standalone/src/node/app.ts` is browser code: `esbuild.js:92` uses it as the entry for a `platform: 'browser'` build (`:99`), so `node/` here means "talks to a Node server" — the opposite of the server packages' convention for the same directory name.
- A 4-module cycle across the client's most complex feature area: `features/tools/change-bounds/change-bounds-manager.ts:50` → `features/helper-lines/helper-line-manager.ts:35` → `features/tools/change-bounds/change-bounds-tool-feedback.ts:23` → back; plus `change-bounds-tool.ts:68` ↔ `change-bounds-tool-move-feedback.ts:42`.
- The protocol's own 6-module type/action cycle: `packages/common/protocol/src/utils/type-util.ts:17` → `action-protocol/base-protocol.ts:18` → `action-protocol/types.ts:20` → back, with `type-util` (fan-in 38) as the entry point.
- Example lint globs are enumerated by package name (`oxlint.config.mts:26-27`), so a newly added example package silently gets no import restrictions at all; the same holds for any new package under `packages/common/`, where only `packages/common/protocol/src/**` is covered.
- `vite.config.ts:31-45` defines test projects for `packages/*` and `dev-packages/*` only — an `examples/**/*.spec.ts` would never run. `examples/` currently has zero specs, which is likely why nobody noticed.
- `packages/server/server/src/browser/di/app-module.ts:18` imports `'../../common/'` with a trailing slash where `node/di/app-module.ts:19` uses `'../../common'`; the trailing form is not resolvable under ESM with `exports`. Adjacent to [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).
- A stale cross-repo path in a comment still describing the pre-consolidation layout: `packages/server/graph/src/default-types.ts:31` refers to `packages/server-node/src/features/model/gmodel-serializer.ts`.
- Structural asymmetry: the server's GModel is its own package (`@eclipse-glsp/graph`, 25 files) while the client's equivalent classes are a single `packages/client/client/src/model.ts` (fan-in 20) that also depends upward on `features/hints/model` (`:28`).
- `examples/workflow-standalone/package.json` lists `inversify` under `devDependencies` although `src/node/app.ts:30` and `src/browser/app.ts:19` use it in shipped code.
- `packages/client/client/src/features/test/layouter-test-util.ts:33` imports `../../default-modules`, so a test helper inside `src/` pulls the entire 270-module client graph; it is excluded from the barrel and from the published `files`, but is still compiled by `tsc -b`.
- `packages/client/client/src/index.ts` is a single flat 247-line barrel with no subpath entry points, so any consumer loads the whole client graph including all CSS side-effect imports. Adjacent to [#1341](https://github.com/eclipse-glsp/glsp/issues/1341) — that issue owns the per-module CSS import; the barrel and entry-point shape is the other half of it.
- `packages/server/server/src/common/di/diagram-module.ts` has a fan-out of 51 — the single largest coupling point on the server. Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
