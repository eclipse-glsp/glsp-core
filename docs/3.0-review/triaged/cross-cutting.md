# Cross-cutting

Two kinds of entry live here, and they are not the same thing:

1. **Cross-cutting findings (X-1 to X-14, `X-4` [withdrawn](#withdrawn)).** A finding is here rather than in a component file when fixing it requires
   a coordinated change in **more than one component**, or when it is a workspace-wide convention that no single
   package owns. These are full findings with the same structure as everywhere else. X-9 to X-13 are a TypeScript
   language and configuration pass: idioms and compiler settings that apply to every package. X-14 is about the
   repository's own record of its decisions.
2. **Themes.** Patterns that recur across components where each _instance_ is already recorded as a component finding.
   A theme files no issue of its own; it exists so the instances can be decided together instead of one at a time.

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

**Triage is complete.** Every finding is filed under [#1817](https://github.com/eclipse-glsp/glsp/issues/1817), itself a sub-issue of [#1744](https://github.com/eclipse-glsp/glsp/issues/1744), in 4 issues. Findings in the same cluster share one issue; each finding's `Filed as` line names it. The candidate issues in the appendix are **not** triaged and are still worth a pass.

---

## Findings

### X-1 · Client and server use unrelated DI composition models, and aligning them needs a project-level decision

> Filed as [#1811](https://github.com/eclipse-glsp/glsp/issues/1811), together with X-2, X-3.

- **Components:** client, server, protocol
- **Location:** `packages/server/server/src/common/di/diagram-module.ts:130` · `packages/client/client/src/default-modules.ts:67` · `packages/common/protocol/src/di/container-configuration.ts:31` (`initializeContainer`, used only by `selection-service.spec.ts:66`)
- **What's wrong:** The client composes with `FeatureModule` plus `ContainerConfiguration` (`add`/`remove`/`replace`, `featureId`, `requires`); the server composes with abstract classes and ~40 `bindXxx()`/`configureXxx()` template methods, with no feature ids, no `replace`, no `requires`, and `ServerModule.configureDiagramModule(module, ...additional)` as the only composition point. An adopter who learns one half learns nothing about the other, and the shared package's own container entry point is unused outside a spec.
- **Constraint:** the server's shape is inherited, not accidental. The Java server came first and the Node server's API was derived from it. The Java server composes with Guice, whose module-and-override style is what the template-method `bindXxx()`/`configureXxx()` pattern mirrors. So the client and the Node server diverge because the Node server is aligned with a *third* implementation, and moving it toward the client would move it away from the Java server that adopters also target.
- **Direction:** An investigation, not a refactor. Map the three composition models (client `FeatureModule`/`ContainerConfiguration`, Node server template methods, Java server Guice modules), identify where the Node server's Guice-derived shape costs adopters and where it is what keeps the two servers learnable together, and bring the options to the GLSP leads and committers. Which model wins, if any, is a project-level design decision, not one this review can make. The earlier suggestion of making `DiagramModule` a `FeatureModule` producer is one input to that discussion, not the recommendation.
- **Size:** M for the investigation; the outcome decides the rest
- **Cluster:** [DI composition](#cluster-di-composition)
- **Adjacent to:** [#1742](https://github.com/eclipse-glsp/glsp/issues/1742). That issue covers _how_ feature modules are configured; this is the server having no feature-module concept at all.
- **Instances:** [SRV-2](server.md), [SRV-25](server.md) (server has no additive contribution path); [CL-32](client.md) (the client's answer to the same problem).

### X-2 · Module load order is load-bearing everywhere, and every ordering failure is silent

> Filed as [#1811](https://github.com/eclipse-glsp/glsp/issues/1811), together with X-1, X-3.

- **Components:** protocol (the mechanism), client, examples
- **Location:** `packages/common/protocol/src/di/feature-module.ts:86` (unmet `requires` → `return false`, no warning unless `DEBUG_LOG_ENABLED`) · `packages/client/client/src/default-modules.ts:178-183` (hard-coded "defaultModule must be first" check) · `examples/workflow-glsp/src/workflow-diagram-module.ts:96` (`bindOrRebind(ISnapper)` only rebinds because `gridModule` at `:110` is listed earlier) · `packages/client/client/src/base/model/model-registry.ts:35` and `base/view/view-registry.ts:32` (duplicate registration = last wins plus a `console.log`)
- **What's wrong:** Thirteen modules declare `requires`, and an unmet requirement makes the module quietly do nothing; `bindOrRebind` degrades to a plain `bind` when it runs first, turning an intended rebind into a duplicate binding; and model/view registration resolves conflicts by overwriting with a console message. The correctness of a container therefore depends on the order of an array the adopter can freely rearrange.
- **Direction:** Resolve module order from the declared `requires` graph instead of trusting array position, and fail loudly on unmet requirements and duplicate element-type registrations.
- **Size:** M
- **Cluster:** [DI composition](#cluster-di-composition)
- **Adjacent to:** [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).

### X-3 · Scope by omission: services that read as singletons are transient

> Filed as [#1811](https://github.com/eclipse-glsp/glsp/issues/1811), together with X-1, X-2.

- **Components:** client, server, examples
- **Location:** `packages/client/client/src/features/bounds/bounds-module.ts:63` (`PositionSnapper`) · `features/copy-paste/copy-paste-modules.ts:22` (`ICopyPasteHandler`) · `features/grid/grid-module.ts:35` (`ISnapper`) · `features/context-menu/context-menu-module.ts:32` (`IContextMenuProviderRegistry`, a _registry_) · `features/change-bounds/resize/resize-module.ts:43,45` · `features/viewport/viewport-modules.ts:64,67` · `examples/workflow-glsp/src/workflow-diagram-module.ts:96` · server side `packages/server/server/src/common/di/diagram-module.ts:147` (`GModelFactory`, the only unscoped binding among its neighbours)
- **What's wrong:** Nine bindings use `.to(X)` with no scope while their immediate neighbours in the same file say `.inSingletonScope()`. There is no stated default, so whether two injection sites share an instance is decided per line and by accident. A registry bound transiently is a hazard the moment anyone registers into it.
- **Direction:** State the default (singleton for services, transient only where deliberate) and let `bindAsService`/`applyBindingTarget` enforce it rather than leaving it to each call site.
- **Size:** S
- **Cluster:** [DI composition](#cluster-di-composition)
- **See also:** [SRV-24](server.md). On the server, the declared scope is not even applied.

### X-5 · The `Service` / `Manager` / `Provider` / `Registry` / `Factory` / `Handler` suffixes carry no rule

> Filed as [#1812](https://github.com/eclipse-glsp/glsp/issues/1812), together with X-6, X-7, X-8.

- **Components:** whole workspace
- **Location:** counts across `packages/*/*/src`: 113 `*Handler`, 42 `*Provider`, 21 `*Registry`, 18 `*Manager`, 12 `*Service`, 6 `*Factory` · concrete clusters: `packages/server/server/src/common/features/model/gmodel-factory.ts:43` (`createModel(): void`, mutates state) vs `common/session/client-session-factory.ts:32` (returns an instance) vs `common/actions/action-handler.ts:60-62` (`ActionHandlerFactory` is a `(ctor) => instance` DI function type) · `common/features/progress/progress-service.ts:308` vs `packages/client/client/src/base/selection-service.ts:66` vs `base/tool-manager/tool-manager.ts:86` with no distinguishing property · `packages/client/client/src/features/copy-paste/copy-paste-handler.ts:59` declares `LocalClipboardService` inside a `*-handler.ts` file
- **What's wrong:** Three words for "produces an instance", two for "coordinates stateful behaviour", and no property that tells them apart. The suffix carries no information an adopter can rely on.
- **Direction:** Write down the four or five roles the codebase actually has (lookup table, instance producer, stateful coordinator, request processor, extension point), map each to exactly one suffix, and rename at the major boundary.
- **Size:** L
- **Cluster:** [naming and shape conventions](#cluster-naming-and-shape-conventions)

### X-6 · Client and server use incompatible conventions for "interface plus default implementation"

> Filed as [#1812](https://github.com/eclipse-glsp/glsp/issues/1812), together with X-5, X-7, X-8.

- **Components:** client, server
- **Location:** server: `packages/server/server/src/common/features/model/model-state.ts:23-42` (`Symbol` + `interface` + `DefaultModelState`), `common/command/command-stack.ts:21-74`, but also `common/features/model/gmodel-factory.ts:410` (`GModelFactoryNullImpl`), `common/features/model/gmodel-index.ts:185` and `common/actions/client-action-handler.ts:148` (bare concrete class as its own DI key), `common/operations/operation-handler.ts:31` (abstract class, not interface + symbol) · client: `packages/client/client/src/base/tool-manager/tool-manager.ts:86` (`IToolManager`/`ToolManager`), `features/grid/grid-manager.ts:42`, `base/shortcuts/shortcuts-manager.ts:38`
- **What's wrong:** Four coexisting patterns for one idea, namely `Symbol` plus `Default*`, `I*` plus concrete, bare class, and abstract class, so an adopter cannot predict what to `@inject` or what to override from the name alone.
- **Direction:** One pattern per side at minimum, ideally one across the workspace, documented next to the DI rules.
- **Size:** M
- **Cluster:** [naming and shape conventions](#cluster-naming-and-shape-conventions)
- **Adjacent to:** [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).

### X-7 · Three coexisting conventions each for construction and for type guards

> Filed as [#1812](https://github.com/eclipse-glsp/glsp/issues/1812), together with X-5, X-6, X-8.

- **Components:** protocol, graph, client, server
- **Location:** construction: `Action.create(...)` namespace factories throughout `packages/common/protocol/src/action-protocol/*`, `GModelElement.builder()` fluent builders at `packages/server/graph/src/gmodel-element.ts:87-115`, plain `new` for commands at `packages/server/server/src/common/command/recording-command.ts:383`, and `commandOf(...)` at `common/gmodel/gmodel-operation-handler.ts:28` · guards: namespace `X.is(object)` (`common/protocol/client-action.ts:27` and every action protocol type), free `isFoo(...)` functions (`packages/common/protocol/src/model/model-schema.ts:42`, `packages/client/client/src/utils/gmodel-util.ts:275-326`, `packages/server/graph/src/gbounds-aware.ts`), and class-namespace guards now deprecated as redundant (`packages/server/graph/src/gedge.ts:293-297`)
- **What's wrong:** Whether a concept is created via `create`, a builder, or `new`, and whether its guard is `Foo.is(x)` or `isFoo(x)`, is decided per file rather than per kind of thing. `GModelElementBuilder.build()` also shallow-copies the proxy (`gmodel-element.ts:104-107`), so the builder convention does not hold its own invariant. In the graph package the result is that there is no guard story at all for `GNode`/`GLabel`/`GPort`/`GCompartment`: `GEdge.is` is the only namespace guard among the element types, and it is deprecated.
- **Direction:** Free `isX` guards for structural/schema types, `X.is` for protocol types; builders for graph elements, `create` for protocol payloads, and no third option.
- **Size:** M
- **Cluster:** [naming and shape conventions](#cluster-naming-and-shape-conventions)
- **See also:** [PROT-6](protocol.md). Protocol guards also disagree with their own interfaces.

### X-8 · File and directory naming diverges per package

> Filed as [#1812](https://github.com/eclipse-glsp/glsp/issues/1812), together with X-5, X-6, X-7.

- **Components:** whole workspace
- **Location:** `packages/server/server/src/common/features/directediting/` and `.../features/contextactions/` vs `packages/client/client/src/features/context-menu/` and `.../features/helper-lines/`, and `examples/workflow-server/src/common/labeledit/`, `.../taskedit/` · `common/utils/layout-util.ts` vs `packages/client/client/src/utils/layout-utils.ts` · `packages/server/server-mcp/src/common/util/` and `examples/workflow-server/src/common/util/` vs `.../utils/` · `packages/server/graph/src/gpre-rendered-element.ts` vs `gshaped-prerendered-element.ts` · `packages/client/client/src/base/shortcuts/shortcuts-manager.ts:38` exports `ShortcutManager` · server handler files split between `*-action-handler.ts` (`request-model-action-handler.ts`) and `*-handler.ts` (`request-markers-handler.ts`, `request-edit-validation-handler.ts`) for identical `ActionHandler` implementations
- **What's wrong:** Compound words are run together in some packages and kebab-cased in others, `util` and `utils` both exist, and one file stem does not match its primary export.
- **Direction:** One rule, enforceable with a lint rule rather than review: kebab-case multiword segments everywhere, `utils` plural, file stem matching its primary export.
- **Size:** S
- **Cluster:** [naming and shape conventions](#cluster-naming-and-shape-conventions)

---

## TypeScript idiom & configuration

Five findings about the language itself rather than about GLSP's design. They are here because none of them belongs to
one package: every one is a rule the whole workspace either follows or does not.

### X-9 · Eleven enums, six of them numeric, and one enum declared twice under two names

> Filed as [#1813](https://github.com/eclipse-glsp/glsp/issues/1813), together with X-10, X-11, X-12, X-13.

- **Components:** client, server, graph, protocol
- **Location:** string enums at `packages/server/graph/src/gresizable.ts:40` (`GResizeLocation`) and `packages/client/client/src/features/change-bounds/model.ts:38` (`ResizeHandleLocation`), **byte-identical apart from the name**; `packages/client/client/src/base/feedback/css-feedback.ts:75` (`CursorCSS`), re-declared as literals in `e2e/workflow-e2e/src/cursors-css.ts:16-39` · numeric enums: `packages/common/protocol/src/client-server-protocol/glsp-client.ts:35` (`ClientState`), `packages/common/protocol/src/action-protocol/element-text-editing.ts:167` (`ValidationStatus.Severity`), `packages/server/server/src/common/diagram/diagram-configuration.ts:25` (`ServerLayoutKind`), `packages/server/server/src/common/utils/logger.ts:54` (`LogLevel`), `packages/client/client/src/features/layout/layout-elements-action.ts:45,281` (`ResizeDimension`, `Alignment`), `packages/client/client/src/features/accessibility/element-navigation/diagram-navigation-tool.ts:82` (`NavigationMode`)
- **What's wrong:** An `enum` emits a runtime object and introduces a nominal type into an otherwise structural codebase, so a plain `'top-left'` is not assignable to `GResizeLocation` even though it is the same string. The two resize-location enums are the same enum written twice on opposite sides of the client/server boundary, kept in step by hand. `ValidationStatus.Severity` is a numeric enum that crosses the wire as an ordinal, which is [PROT-2](protocol.md) seen from the language side. The remaining numeric enums make a JSON dump or a log line read `2` with nothing to say what 2 was.
- **Direction:** A frozen const object plus a derived union, the shape `DefaultTypes` and `MarkerKind` already use in this repo, so the values stay plain strings, assignable and readable in serialized form. Declare the shared resize locations once and import them on both sides. The wire-facing one has to move with [PROT-2](protocol.md) and the Java server.
- **Size:** M
- **Cluster:** [TypeScript and compiler configuration](#cluster-typescript-and-compiler-configuration)
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740). `const enum` and cross-module enum merging are exactly what breaks under isolated transpilation, so this is cheapest to do alongside the module-format change.

### X-10 · 209 namespaces: 27 that want to be objects, and 182 that are the protocol's API

> Filed as [#1813](https://github.com/eclipse-glsp/glsp/issues/1813), together with X-9, X-11, X-12, X-13.

- **Components:** protocol (106), client (77), server (10), graph (8), e2e (21), examples (5), cli (2)
- **Location:** pure value namespaces with no same-name type to merge with, e.g. `packages/common/protocol/src/model/default-types.ts:20` (`DefaultTypes`), `packages/common/protocol/src/action-protocol/element-validation.ts:44` (`MarkerKind`), `packages/server/server/src/common/utils/args-util.ts:18` (`ArgsUtil`), `packages/client/client/src/utils/marker.ts:19` (`MarkerPredicates`), `packages/client/client/src/features/grid/grid-style.ts:17` (`GridProperty`), the three accessibility `constants.ts` metadata namespaces · merged namespaces, e.g. every `Action` type in `packages/common/protocol/src/action-protocol/*` carrying `create` and `is` · enum-plus-namespace merges at `gresizable.ts:40,51` and `model.ts:38,49`
- **What's wrong:** Two different things share one keyword here, and only one of them is a problem. The 27 pure value namespaces are namespaces used for code organization, which is what ESM modules are for: they add a runtime object, and could each be module-level exports. The other 182 merge a namespace with a same-name interface to attach `create` and `is`, which is a supported and deliberate API idiom, not deprecated syntax. What is worth deciding is its cost: it is why [X-7](#x-7--three-coexisting-conventions-each-for-construction-and-for-type-guards) has two guard conventions, why the protocol augments third-party modules with `declare module` ([PROT-8](protocol.md)), and, in a small way, why using one helper keeps its siblings (see the tree-shaking note below).
- **Direction:** Convert the 27 to module-level exports, not `const` objects, since only the former tree-shake; that part is uncontroversial. For the 182, decide once and write it down: keep the merged-namespace idiom as the protocol's stated API shape, or move to free functions and drop it everywhere. Do not leave it as a per-file choice.
- **Tree-shaking, measured.** Namespaces are the smallest of four stacked reasons the protocol does not tree-shake. Bundling a consumer that uses only `SetModelAction.is` with esbuild 0.28, dependencies included:

  | Protocol as | Bytes | Protocol files | `vscode-jsonrpc` files |
  |---|---|---|---|
  | published today (CommonJS `lib/`) | 312,747 | all | 17 |
  | ESM source, barrel import | 268,261 | 49 | 17 |
  | ESM source, barrel, `"sideEffects": false` | 268,261 | 49 | 17 |
  | ESM source, barrel, `"sideEffects": false`, no `export *` of Sprotty | 27,083 | 4 | 0 |
  | ESM source, direct import of `action-protocol/model-data` | 26,717 | 4 | 0 |

  In order of effect: the output is CommonJS (`dev-packages/ts-config/tsconfig.json`, `"module": "commonjs"`), which no bundler can shake, so nothing else matters until [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) lands. `packages/common/protocol/package.json` declares no `sideEffects`, so every module with top-level statements is kept. `re-exports.ts:55-57` does `export * from` three `sprotty-protocol` modules, which are CommonJS, so the bundler cannot enumerate their names and turns the whole barrel into a runtime namespace object; this one line is what makes `sideEffects: false` a no-op, and removing it takes the barrel from 49 files to 4. Only then does the namespace idiom show: using `is` keeps `create` and `KIND`, because a namespace compiles to one object built in an IIFE.

  Converting a namespace to a `const` object does **not** fix that last part. A namespace, a `const` object and free functions measured 447, 282 and 190 bytes for the same `is`/`create` pair, and only the free functions dropped the unused `create`. Per-member shaking needs module-level exports.

  Declaring `"sideEffects": false` also needs care. `sprotty-actions.ts:81-114` assigns `is` onto *imported* Sprotty namespaces at module load, and `di/re-decorate.ts:22` calls `decorate()` at module load ([PROT-20](protocol.md)). Both are real side effects and must be listed in the field, or a consumer that reaches those guards through `sprotty-protocol` directly gets `undefined`, the same failure as `BringToFrontAction.is` in [PROT-8](protocol.md).

  Path to a shakeable protocol, cheapest first: `"sideEffects"` listing those two files; named re-exports instead of `export *` in `re-exports.ts`, which may resolve itself once Sprotty 2.0, which is ESM-only, is consumed; ESM output via #1740. The namespace decision above then only affects per-action granularity, a few hundred bytes each.
- **Size:** S for the 27, L for the decision on the rest
- **Cluster:** [TypeScript and compiler configuration](#cluster-typescript-and-compiler-configuration)
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).

### X-11 · Two type-safety checks are disabled workspace-wide to accommodate property injection

> Filed as [#1813](https://github.com/eclipse-glsp/glsp/issues/1813), together with X-9, X-10, X-12, X-13.

- **Components:** whole workspace
- **Location:** `dev-packages/ts-config/tsconfig.json`, where `"strictPropertyInitialization": false` and `"useDefineForClassFields": false` are each preceded by the comment `// Needs to be disabled to support property injection`
- **What's wrong:** The DI style of one layer sets the type-checking rules for every package, including code that uses no DI at all. Nothing anywhere is checked for definite assignment, so an ordinary field that a constructor forgets to set is not an error; and because `useDefineForClassFields` is off against a `target: ES2023`, class fields do not follow the semantics the target implies, which is a trap for anyone writing a plain class or reading the emitted output.
- **Direction:** Pay the cost where it is incurred instead of globally: `declare` or a definite-assignment `!` on injected fields, or constructor injection, and then turn both checks back on. Inversify 8 and standard decorators force this area open anyway, so 3.0 is when it is cheapest to settle.
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).
- **Size:** M
- **Cluster:** [TypeScript and compiler configuration](#cluster-typescript-and-compiler-configuration)

### X-12 · The compiler checks that would have caught this review's most repeated bug shapes are off

> Filed as [#1813](https://github.com/eclipse-glsp/glsp/issues/1813), together with X-9, X-10, X-11, X-13.

- **Components:** whole workspace
- **Location:** `dev-packages/ts-config/tsconfig.json`, where `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedParameters`, `isolatedModules` and `verbatimModuleSyntax` are all unset
- **What's wrong:** Three of this review's recurring shapes are things the compiler can find. `exactOptionalPropertyTypes` addresses declared-optional-but-actually-required fields: [SRV-11](server.md) (`position`/`size`), [CL-14](client.md) (`modelRoot`), [PROT-11](protocol.md) (`revision`). `noUncheckedIndexedAccess` addresses the string-keyed bags: [SRV-21](server.md) (`ModelState`), [CL-13](client.md) (`messages`). `isolatedModules` and `verbatimModuleSyntax` state the constraints the esbuild and Vite pipelines already impose but that `tsc` does not currently enforce, which matters because bundling is how every artifact in this repo is produced.
- **Direction:** Turn them on one at a time, each as its own change with its own fallout. `isolatedModules` first, since it is nearly free given 101 files already use `import type`, and it protects the bundlers.
- **Size:** M per flag, and each will produce real errors, which is the point
- **Cluster:** [TypeScript and compiler configuration](#cluster-typescript-and-compiler-configuration)
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).

### X-13 · Every package type-checks against both Node and the DOM

> Filed as [#1813](https://github.com/eclipse-glsp/glsp/issues/1813), together with X-9, X-10, X-11, X-12.

- **Components:** whole workspace
- **Location:** `dev-packages/ts-config/tsconfig.json`, where `"types": ["node"]` and `"lib": ["ES2023", "dom"]` are inherited by every package with no per-package override
- **What's wrong:** The browser packages compile with Node's globals in scope and the Node packages compile with the DOM in scope, so the type system cannot tell anyone they have reached into the wrong platform. This is the type-level counterpart of two findings that exist because nothing objected: [SRV-29](server.md), where `common/` imports `net` and survives only because every use sits in a type position, and [PROT-18](protocol.md), where a browser Web Worker transport ships through the shared package into every Node consumer.
- **Direction:** Drop both from the shared base and declare them per package: `types: ["node"]` for the Node entry points, `lib: [..., "dom"]` for the browser ones, nothing extra for `common/`. That makes the `common`/`node`/`browser` split a compiler rule rather than a convention, which is what SRV-29 asks for.
- **Size:** M
- **Cluster:** [TypeScript and compiler configuration](#cluster-typescript-and-compiler-configuration)

---

## Process

### X-14 · The decisions that shape this codebase are not written down, and this review kept mistaking them for defects

> Filed as [#1814](https://github.com/eclipse-glsp/glsp/issues/1814).

- **Components:** whole workspace
- **Location:** there is no `docs/adrs/`, no architecture document and no design record in git history; `AGENTS.md` is eight lines, and `docs/` did not exist before this review · the intended layering exists only as `oxlint.config.mts`, reported as warnings ([TOOL-1](tooling.md)) · the one constraint that *is* written down, `dev-packages/ts-config/tsconfig.json`'s `// Needs to be disabled to support property injection`, is a comment stating the what and not the why or the alternatives ([X-11](#x-11--two-type-safety-checks-are-disabled-workspace-wide-to-accommodate-property-injection))
- **What's wrong:** A competent reader with the whole repository in front of them cannot distinguish a deliberate constraint from an oversight. This review is the measurement, not a prediction:
  - [PROT-1 was withdrawn](protocol.md#withdrawn) after two rewrites. The model-load exchange is inherited from `sprotty-protocol` and Sprotty's own server is the reference implementation for fixing it. Nothing said so.
  - [PROT-14](protocol.md) was written as "undo/redo bypass the operation pipeline" before it emerged that they are actions *because* operations are recorded on the command stack, so routing them through it would record the undo itself.
  - [TOOL-3 was withdrawn](tooling.md#withdrawn): root-level dev tooling plus `publicHoistPattern` is how a pnpm monorepo is meant to work, not a hoisting accident.
  - The `@eclipse-glsp/playwright` → `@eclipse-glsp/client` dependency was *built* before the constraint surfaced that the framework is consumed by the VS Code and Theia integration suites, so the dependency would pin those integrations to a client version ([E2E-2](e2e.md)).
  - [EX-1](examples.md): `node/` and `browser/` mean something different in `workflow-standalone` than everywhere else, which reads as a mistake until someone explains it.
- **The cost is not this document.** Every adopter, every new contributor and every agent working in this repository pays the same tax, and the 3.0 refactors will be reviewed by people who were not in the conversations that set these constraints.
- **Direction:** Seed a small ADR set, one page each covering context, decision and consequences, from the decisions this review had to reverse-engineer. An opening set, each already evidenced by a finding: undo/redo as actions rather than operations; which parts of the wire protocol are inherited from Sprotty and what that forecloses; what the Sprotty seam promises and what leaks through re-export ([CL-1](client.md)); the `common`/`node`/`browser` split and the example that inverts it ([SRV-29](server.md), [EX-1](examples.md)); why `useDefineForClassFields` and `strictPropertyInitialization` are off ([X-11](#x-11--two-type-safety-checks-are-disabled-workspace-wide-to-accommodate-property-injection)); why the Playwright framework may not depend on the client; how tooling binaries resolve; the DI scope default ([X-3](#x-3--scope-by-omission-services-that-read-as-singletons-are-transient)) and the contribution-point override policy ([CL-11](client.md)); why the server packages type their bare entry point as the `common` intersection while `main` resolves to `node`; why the Node server's DI follows the Java server's Guice style rather than the client's ([X-1](#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision)); and `CompoundOperation`'s atomicity contract. Write each one where it is enforceable, next to the types or as the rationale a lint rule cites, rather than only in a folder.
- **Size:** M for the opening set, then per-decision
- **Adjacent to:** [#1744](https://github.com/eclipse-glsp/glsp/issues/1744), the review this came out of. Several of these ADRs are the *output* of deciding a finding, so they are cheapest to write as each one is resolved rather than in one pass afterwards.

---

## Cluster: TypeScript and compiler configuration

The language-level pass. Five findings about what the compiler is and is not asked to check, all decided in `dev-packages/ts-config/tsconfig.json` or by one repo-wide convention.

- [X-9](#x-9--eleven-enums-six-of-them-numeric-and-one-enum-declared-twice-under-two-names): eleven enums, six numeric, and one enum declared twice under two names.
- [X-10](#x-10--209-namespaces-27-that-want-to-be-objects-and-182-that-are-the-protocols-api): 209 namespaces: 27 that want to be objects, and 182 that are the protocol's API idiom.
- [X-11](#x-11--two-type-safety-checks-are-disabled-workspace-wide-to-accommodate-property-injection): two type-safety checks disabled workspace-wide to accommodate property injection.
- [X-12](#x-12--the-compiler-checks-that-would-have-caught-this-reviews-most-repeated-bug-shapes-are-off): the compiler checks that would have caught this review's most repeated bug shapes are off.
- [X-13](#x-13--every-package-type-checks-against-both-node-and-the-dom): every package type-checks against both Node and the DOM.

---

## Cluster: naming and shape conventions

Four findings about vocabulary rather than behaviour. Deciding them separately produces four inconsistent answers.

- [X-5](#x-5--the-service--manager--provider--registry--factory--handler-suffixes-carry-no-rule): the `Service` / `Manager` / `Provider` / `Registry` / `Factory` / `Handler` suffixes carry no rule.
- [X-6](#x-6--client-and-server-use-incompatible-conventions-for-interface-plus-default-implementation): client and server use incompatible conventions for interface plus default implementation.
- [X-7](#x-7--three-coexisting-conventions-each-for-construction-and-for-type-guards): three coexisting conventions each for construction and for type guards.
- [X-8](#x-8--file-and-directory-naming-diverges-per-package): file and directory naming diverges per package.

---

## Cluster: DI composition

The two containers and the rules neither of them states.

- [X-1](#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision): client and server are two unrelated DI frameworks that share four helper functions.
- [X-2](#x-2--module-load-order-is-load-bearing-everywhere-and-every-ordering-failure-is-silent): module load order is load-bearing everywhere, and every ordering failure is silent.
- [X-3](#x-3--scope-by-omission-services-that-read-as-singletons-are-transient): scope by omission: services that read as singletons are transient.

---

## Withdrawn

**`ActionHandler`, `ActionHandlerRegistry` and the `G*` model classes each name two or three unrelated things** (the
previous `X-4`). It argued that the server's `ActionHandler` and the client's `IActionHandler` are different contracts
under one word, and that `GEdge` on the client is not `GEdge` on the server.

The pattern is deliberate and consistent. Each side has one action handler contract and one registry, doing the same
job for its own end of the communication flow; one runs in the client and one in the server, so their signatures
differ, and that is expected rather than a naming defect. Likewise the `G*` classes are each side's implementation of
the shared `GModelSchema`, and each lives inside the bounds of its component. A reader working in one package meets
one meaning. The appendix item about the two model layers having different package shapes rested on the same premise
and was removed with it.

---

## Themes

Each instance below is a finding in its own component file. The theme is the reason to decide them together.

### Re-exports

No package states what its public API is, and some forward a package released on someone else's schedule. Re-exporting a GLSP package that ships in lockstep is deliberate (see the withdrawn `SRV-1` in [server.md](server.md#withdrawn)); re-exporting Sprotty is the case that matters.

- [CL-1](client.md): `@eclipse-glsp/client` re-exports all of Sprotty, via ~120 deep `sprotty/lib/...` paths.
- [PROT-8](protocol.md) and the protocol appendix: twelve Sprotty actions are wire contract by re-export, and three whole sprotty modules are re-exported wholesale.
- [PROT-16](protocol.md): the shared DI layer is reachable only via a `lib/` build path.
- [#1740](https://github.com/eclipse-glsp/glsp/issues/1740): no package has an `exports` map, which is the only reason the `lib/` path is legal. Recorded as the withdrawn `TOOL-2` in [tooling.md](tooling.md#withdrawn).

### Lifecycle and disposal

Setup has a contract on both sides; on the server, teardown has none. The client side is covered: integrations tear diagram containers down with `container.unload()`, which runs `@preDestroy` (see the withdrawn `CL-23` in [client.md](client.md#withdrawn-and-folded)).

- [SRV-13](server.md) / [SRV-15](server.md): session disposal disposes one object and leaks the container; the server uses zero `@preDestroy`.
- The connection level uses the **opposite** convention: `packages/server/server/src/common/launch/jsonrpc-server-launcher.ts:142-147` does `unbindAll()` the connection container.
- [CL-24](client.md): tools install document-level listeners that cannot be removed by construction.

### Contribution points

Adding something to GLSP works differently depending on where you add it, and none of the policies is stated in an API.

- [CL-11](client.md): five client registries, five override policies (first-wins, last-wins, all-wins, two of them logging).
- [SRV-25](server.md): three structurally identical, mutually incompatible multi-binding mechanisms.
- [SRV-2](server.md): server handlers are contributable only by subclassing `DiagramModule`.
- [X-2](#x-2--module-load-order-is-load-bearing-everywhere-and-every-ordering-failure-is-silent): whichever path is used, ordering failures are silent.

### Untyped escape hatches

The load-bearing values of the framework travel through `any`-typed bags.

- [PROT-3](protocol.md): `Args` carries the diagram's identity (`sourceUri`), with no field in the protocol at all.
- [SRV-21](server.md): `ModelState` is a string-keyed `any` bag fed directly from client-supplied options.
- [CL-13](client.md): `messages` intersects `Record<string, any>` while documenting itself as type-safe.
- [PROT-4](protocol.md) / [CL-28](client.md): direction and routing are a mutated `__`-prefixed property on the payload.

### Two implementations of one concept

Each of these is a fork that 3.0 can close, and each is cheaper to close now than after the release.

- [CL-21](client.md): keyboard vs mouse change-bounds.
- [X-1](#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision): client vs server DI composition.
- [CL-12](client.md): four copy-pasted edge routers.
- [SRV-16](server.md): the model handshake, run as a latch on a singleton field where Sprotty's own server threads the causing action as a parameter.

### Truthiness instead of definedness

The same bug shape in four places, each silently discarding a valid `0` or `false`:

- `ArgsUtil.getNumber`/`getBoolean`: [server appendix](server.md#public-api-and-contracts).
- `argument-utils.getArguments`: [client appendix](client.md#public-api).
- `GEdge.addRoutingPoint` and `GIssueMarker`: [SRV-10](server.md).

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

This is also the **only** place a cross-component candidate issue is listed. An observation whose evidence or whose
fix spans more than one package lives here, not in each component file that happens to touch it.

- Two parallel binding-helper vocabularies ship side by side through the server barrel: `bindOrRebind`/`lazyBind`/`bindAsService` (`packages/common/protocol/src/di/inversify-util.ts:49-111`) and `BindingTarget`/`applyBindingTarget` (`packages/server/server/src/common/di/binding-target.ts:31-74`).
- The binding-context parameter has five different shapes across helpers: `BindingContext`, `Pick<BindingContext,'bind'|'isBound'>`, `Pick<…,'bind'>`, an inline `{bind, isBound}`, and `context | interfaces.Bind` unions (`protocol/src/di/inversify-util.ts:49,76,103`, `server/.../di/binding-target.ts:32`, `protocol/src/di/lazy-injector.ts:112`, `client/.../views/base-view-module.ts:64`); the server keeps a deprecated duplicate interface `ModuleContext` (`common/di/glsp-module.ts:25`), and `examples/workflow-standalone/src/common/di.config.ts:47` passes a raw `Container` where a context is expected.
- Optionality is re-encoded at every injection site rather than once: ~40 `@optional()` in the client and ~25 on the server, including four in one constructor at `packages/client/client/src/features/tools/change-bounds/change-bounds-manager.ts:188-191`.
- Client contribution harvesting is pull-based via `LazyInjector` while server harvesting is push-based via constructor `@multiInject` (`features/contextactions/context-actions-provider-registry.ts:30`, `navigation/navigation-target-provider-registry.ts:32`, `directediting/context-edit-validator-registry.ts:34`, `protocol/glsp-server.ts:68-69`): two opposite answers to one problem in one repo.
- `bindAsService` (`protocol/src/di/inversify-util.ts:103`) deliberately creates two identifiers per service, and framework code then injects the concrete one (`client/.../features/tools/base-tools.ts:62-63` injects `GLSPMouseTool`/`GLSPKeyTool` while `base/default.module.ts:99,104` aliases `MouseTool`/`KeyTool` to them): replacing such a service requires rebinding both.
