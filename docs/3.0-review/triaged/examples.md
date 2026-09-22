# Examples: `examples/*`

Packages: `workflow-glsp` (client), `workflow-server`, `workflow-server-bundled`, `workflow-server-bundled-web`,
`workflow-server-mcp-demo`, `workflow-standalone`.

**1 finding.** The examples were swept as the in-tree stand-in for an adopter: where the Workflow example has to
work around the framework, that is evidence about the framework and is recorded in [client.md](client.md) or
[server.md](server.md) rather than here. What is left here is what is wrong with the examples *themselves*.

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

---

## Findings

### EX-1 · Two sibling examples use the same `node`/`browser` vocabulary for opposite distinctions

> Filed as [#1765](https://github.com/eclipse-glsp/glsp/issues/1765).

- **Location:** `examples/workflow-standalone/src/node/app.ts:16-33` imports `@eclipse-glsp/client` and `GLSPWebSocketProvider`, and `esbuild.js:92` makes it the entry of a `platform: 'browser'` build (`:99`) · `examples/workflow-standalone/src/browser/app.ts:18,30` is the same kind of client app, differing only in that it starts the server as a web worker via `GLSPWebWorkerProvider` · `examples/workflow-standalone/package.json:31-32` (`"main": "lib/node/app"`, `"browser": "lib/browser/app"`) · contrast the sibling `examples/workflow-server/src/{common,node,browser}` and `package.json:44-45`, where the same layout and the same two fields carry the server packages' meaning
- **What's wrong:** In `workflow-server` and in every `packages/server/*` package, `node/` and `browser/` say **where the code runs**. In `workflow-standalone` they say **where the server the app talks to runs**, and both directories hold browser code. The two packages sit in the same folder and teach a reader opposite rules for the same names. `package.json` then repeats the confusion in the field pair the Node ecosystem reserves for exactly the first meaning: `main` advertises `lib/node/app`, a Node entry point for code that opens a `WebSocket` and drives the DOM.
- **Direction:** Rename the two directories to say what they actually select, for example `src/remote-server/` and `src/worker-server/`, leaving `node`/`browser` to mean the runtime everywhere in the repo. Drop `main` and `browser` from this package: it is `private: true`, nothing resolves them, and the real artifact is `app/bundle.js` produced by esbuild and loaded from `app/diagram.html:314`.
- **Size:** S
- **See also:** [SRV-29](server.md). The enforcement of the real `common`/`node`/`browser` split has to not be fooled by this package.

---

## Where the examples are evidence about the framework

These are recorded elsewhere, but every one of them was found by watching what the Workflow example had to do:

- [Withdrawn `CL-3`](client.md#withdrawn-and-folded): `workflow-glsp` calls `configureDefaultModelElements` by hand. That is the intended way to register defaults, not a workaround.
- [X-2](cross-cutting.md): `workflow-diagram-module.ts:96`'s `bindOrRebind(ISnapper)` is correct only because `gridModule` is listed earlier in the array.
- [X-3](cross-cutting.md): the example inherits the unstated scope default.
- [CL-2](client.md): the example binds the *correct* context-menu symbol, which is how the framework's shadow symbol was found.
- [E2E-3](e2e.md): `workflow-standalone` is launched by the e2e suite through a hard-coded relative path.

---

## What was not reviewed

The examples were read as adopter evidence, not reviewed as products. Not covered:

- Whether the example set is the right one for 3.0. [#1183](https://github.com/eclipse-glsp/glsp/issues/1183)
  (Workflow on a real source model) and [#1711](https://github.com/eclipse-glsp/glsp/issues/1711) (a `gmodel-demo`
  language) own that question.
- The bundling variants (`workflow-server-bundled`, `-bundled-web`) as a maintained matrix: what they duplicate, and
  whether all four server flavours need to exist.
- Documentation value, meaning whether the examples read as teaching material, which is the main thing an adopter
  uses them for.

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

- `examples/workflow-server/src/common/workflow-diagram-module.ts:72`: `WorkflowDiagramModule` satisfies the base class's `protected abstract bindSourceModelStorage()` with a **public constructor field** holding a closure. The template-method binding API has no way to parameterize a module, so adopters overload method slots. See [X-1](cross-cutting.md).
- `examples/workflow-server/src/node/app.ts:60,64`: server launchers are obtained with `appContainer.resolve(...)` rather than `get`, so they are unbound instances no module can substitute.
- `examples/workflow-standalone/package.json` lists `inversify` under `devDependencies` although `src/node/app.ts:30` and `src/browser/app.ts:19` use it in shipped code.
- `examples/workflow-server-mcp-demo/src/index.js:18,137` sends its own hard-coded `GLSP_PROTOCOL_VERSION = '1.0.0'`, while the authoritative constant is `packages/common/protocol/src/client-server-protocol/glsp-client.ts:176` and the server rejects any mismatch outright (`packages/server/server/src/common/protocol/glsp-server.ts:76`). The demo is `private: true` and never published, but `pnpm bundle:site` does build it into `dist-site/mcp-demo/index.html` (`scripts/assemble-site.mjs:42-45`), so a protocol version bump silently breaks a page that ships. It is excluded from lint (`oxlint.config.mts:71`) and from the tsconfig references, so nothing catches it. Worth a checklist line in [#1743](https://github.com/eclipse-glsp/glsp/issues/1743) rather than work of its own. The demo's hand-maintained `CLIENT_ACTION_KINDS` list (`:27`) is *not* a problem: a demo choosing which flows it handles is reasonable.
