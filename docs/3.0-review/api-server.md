# A2 — Public API surface & extension points: server and protocol

Surface swept: `packages/server/server`, `packages/server/graph`, `packages/server/layout-elk`,
`packages/server/server-mcp`, `packages/common/protocol` (~26k LOC).

`layout-elk` and `server-mcp` are treated as the in-tree stand-ins for an external adopter: where they have to reach
past the server's public surface, that is evidence about the surface.

Every finding below was verified against the source. Several are live defects rather than design questions; that is
stated in the finding.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A2-1 · The protocol package's DI API is reachable only through a `lib/` deep path

- **Location:** `packages/common/protocol/src/index.ts` (no `./di` export) · `packages/common/protocol/package.json:38-39` (`main`/`types`, no `exports` map) · 9 source call sites, e.g. `packages/server/server/src/common/reexport.ts:19`, `packages/server/server/src/common/di/glsp-module.ts:16`, `packages/client/glsp-sprotty/src/re-exports.ts:21`, `packages/client/glsp-sprotty/src/feature-modules.ts:17`
- **What's wrong:** `BindingContext`, `bindOrRebind`, `FeatureModule` and `LazyInjector` are absent from the root barrel, so both the server _and_ the client import them as `@eclipse-glsp/protocol/lib/di` — the compiler output directory is part of the public import path, and `packages/server/server/src/common/utils/registry.ts:16` even deep-imports `lib/utils/array-util` for `remove`, which the root barrel already exports.
- **Direction:** Either fold `di` into the root barrel or declare real `exports` subpaths (`@eclipse-glsp/protocol/di`), so `lib/` stops being API.
- **Size:** M
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) — that issue covers the module format; this is the entry-point map, which is a separate decision.

### A2-2 · `@eclipse-glsp/server` re-exports the entirety of protocol and graph

- **Location:** `packages/server/server/src/common/reexport.ts:17-19` · consumed at `packages/server/layout-elk/src/element-filter.ts:16` · collision already forcing an alias at `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:26`
- **What's wrong:** Every protocol and GModel symbol is _also_ a `@eclipse-glsp/server` symbol, so any protocol change is a server breaking change, every symbol has two legitimate import paths, and the server's own identifiers already collide with re-exported ones (`McpServerOptions as McpServerOptionsType`).
- **Direction:** Re-export a curated named set, or nothing, and have adopters import GModel from `@eclipse-glsp/graph` directly.
- **Size:** M

### A2-3 · Action and operation handlers can only be contributed by subclassing `DiagramModule`

- **Location:** `packages/server/server/src/common/di/diagram-module.ts:166-172` (`toConstantValue(array)`) · `packages/server/server/src/common/actions/action-handler-registry.ts:49-51` (`@inject`, not `@multiInject`) · worked around at `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:154-155`
- **What's wrong:** Handler lists are bound as a single constant array injected with `@inject`, so a second `ContainerModule` cannot append a handler — only collide with the existing binding; the sole additive path is overriding `configureActionHandlers` / `configureOperationHandlers` in a `DiagramModule` subclass, which is why the MCP module drops to raw `bind().toService()` with an explanatory comment.
- **Direction:** A contribution point usable from any module — `multiInject` with per-module binds, or a registry API mirroring the client's `FeatureModule` / `ContainerConfiguration`.
- **Size:** L

### A2-4 · `MultiBinding` has no scope control and erases its own type, so the one adopter reimplemented it

- **Location:** `packages/server/server/src/common/di/multi-binding.ts:73-77` · `packages/server/server/src/common/di/glsp-module.ts:64-67` · reimplemented at `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:93-102`, with casts at `:164-172` and `packages/server/server-mcp/src/common/modules/mcp-diagram-module.ts:108-118`, and `bind`/`rebind` cached as fields at `mcp-diagram-module.ts:92-93,101-102`
- **What's wrong:** `applyBindings` binds transient with no way to choose scope, and `configureMultiBinding<T>` erases the binding subtype — so `server-mcp` wrote its own `McpHandlerMultiBinding`, casts every configurator argument back, and stashes `bind`/`rebind` because `GLSPModule` exposes no binding context.
- **Direction:** Scope-aware multi-binding, generic over the binding type, plus a public accessor for the module's `BindingContext`.
- **Size:** M

### A2-5 · `bindOperations` instantiates every operation handler with `new` outside the container

- **Location:** `packages/server/server/src/common/di/diagram-module.ts:276-282` · trick copied at `packages/server/server-mcp/src/common/mcp-tool-handler.ts:456-460`
- **What's wrong:** `new constructor().operationType` runs each handler's constructor with no DI and no arguments purely to read a string, which silently constrains every operation handler to a zero-argument constructor and a constructor-time-constant `operationType` — a contract that is neither stated nor enforceable.
- **Direction:** Declare the operation type as a static field on the constructor, or read it from the already-resolved registry instead of a throwaway instance.
- **Size:** M

### A2-6 · `CreateOperationHandler.is` demands `instanceof` a class the type only describes structurally

- **Location:** `packages/server/server/src/common/operations/create-operation-handler.ts:67-77` · consumed at `packages/server/server/src/common/operations/operation-handler-registry.ts:25-32` and `packages/server/server/src/common/features/contextactions/tool-palette-item-provider.ts:67`
- **What's wrong:** `CreateEdgeOperationHandler` and `CreateNodeOperationHandler` are _interfaces_, so a handler can satisfy the type without extending `OperationHandler` — the guard then rejects it, it is registered under a key without the `_elementTypeId` suffix, and it silently disappears from the tool palette with no error anywhere.
- **Direction:** Make the create-handler contract structural end to end (drop the `instanceof`), or make the abstract class the only declared way to implement it.
- **Size:** S

### A2-7 · The documented `ActionHandler.priority` ordering never takes effect

- **Location:** `packages/server/server/src/common/actions/action-handler-registry.ts:40` · contract documented at `packages/server/server/src/common/actions/action-handler.ts:44-53`
- **What's wrong:** `a.priority ?? 0 - (b.priority ?? 0)` parses as `a.priority ?? (0 - (b.priority ?? 0))` because `??` binds looser than `-`, so the comparator returns `a`'s priority instead of a difference — the documented "descending priority, handlers > 0 run first" contract is not what the code does. This is a live defect.
- **Direction:** Fix the comparator and add the ordering test; 3.0 is also the moment to decide whether priority stays an untyped optional number.
- **Size:** S

### A2-8 · `GModelOperationHandler` is missing its decorator — `injectable();` is a bare call

- **Location:** `packages/server/server/src/common/gmodel/gmodel-operation-handler.ts:23`
- **What's wrong:** The `@` is missing, so the base class of every GModel operation handler is undecorated; this works today only because each concrete subclass carries its own `@injectable()`, and an adopter who omits one gets an opaque inversify resolution failure. This is a live defect.
- **Direction:** Restore the decorator, and lint for bare decorator-shaped call expressions.
- **Size:** S

### A2-9 · `layout-elk` cannot use the server's own DI, and its injected logger is never populated

- **Location:** `packages/server/layout-elk/src/di.config.ts:139-149` (`dynamicValue` manually resolving four services and `new`-ing the engine) · `packages/server/layout-elk/src/glsp-elk-layout-engine.ts:54-55` (`@inject(Logger) protected readonly logger`) used at `:135`
- **What's wrong:** `GlspElkLayoutEngine` takes constructor parameters the framework's binding helpers cannot supply, so the module constructs it by hand — which skips property injection, leaves `this.logger` undefined, and turns the "multiple sources or targets" warning path into a `TypeError`.
- **Direction:** Make the engine fully property-injected, or give `BindingTarget` a first-class way to pass constructor arguments, so the in-tree adopter uses the DI path the framework documents for everyone else.
- **Size:** S

### A2-10 · `layout-elk`'s documented override points for labels and ports are dead code

- **Location:** `packages/server/layout-elk/src/element-filter.ts:51-55` (`this.filterLabel(element);` — result discarded, falls through to `return true`) · identical shape at `packages/server/layout-elk/src/layout-configurator.ts:52-56` (falls through to `return undefined`)
- **What's wrong:** Both classes document these methods as _the_ customization hook, but the missing `return` means overriding `filterLabel`, `filterPort`, `labelOptions` or `portOptions` has no observable effect whatsoever. This is a live defect.
- **Direction:** Return the values; the duplicated `instanceof` dispatch across both classes is also a candidate for one shared visitor.
- **Size:** S

### A2-11 · The GModel builder family is inconsistent type by type, and two builders silently drop `0`

- **Location:** `packages/server/graph/src/gport.ts:21` (generic builder, no dedicated one) · `gbutton.ts:21`, `glabel.ts:23` (optional constructor parameter) vs `gnode.ts:22`, `gedge.ts:20`, `gcompartment.ts:21` (none) · `gmodel-element.ts:99-102` (`reset()` drops the constructor's invariants, so `build()` then throws) · `gmodel-element.ts:104-107` (`Object.assign` shares `children`/`args` between built element and proxy) · `gedge.ts:69` (`else if (y)` discards `addRoutingPoint(x, 0)`) · `gissue-marker.ts:34` (`else if (severity)` discards the issue)
- **What's wrong:** Six different builder shapes, a `reset()` that yields an unbuildable builder, aliasing between successive `build()` calls, and two fluent methods that discard valid input because they test truthiness instead of definedness.
- **Direction:** One builder contract per element type with a uniform `builder(constructor?)` signature, a `reset()` that re-runs the constructor invariants, a copying `build()`, and explicit `undefined` checks.
- **Size:** M

### A2-12 · `GShapeElement` declares `position`/`size` as always present while the trait declares them optional

- **Location:** `packages/server/graph/src/gshape-element.ts:24-25` (`position: Point; size: Dimension;`) vs `packages/server/graph/src/gbounds-aware.ts:22-23` (`position?: Point; size?: Dimension;`) · `packages/server/graph/src/ggraph.ts:34` (`size?`) · worked around at `packages/server/server/src/common/gmodel/change-bounds-operation-handler.ts:42`
- **What's wrong:** `GNode.size` is typed non-optional but nothing guarantees it is set — no builder call, no serializer default — so server code that trusts the type reads `undefined`; the framework's own change-bounds handler already guards against it.
- **Direction:** Pick one and hold it: optional everywhere with explicit guards, or required with a builder and serializer that guarantee a value.
- **Size:** M

### A2-13 · GModel trait builders reach into a `protected` member by string index

- **Location:** `packages/server/graph/src/gbounds-aware.ts:35,51` (`const proxy = builder['proxy'];`) · same at `galignable.ts:34`, `glayoutable.ts:34,44`, `glayouting.ts:33`, `gedge-layoutable.ts:41`, `gresizable.ts:34` · plus `console.warn` and a silent `y: 0` coercion at `gbounds-aware.ts:42-45` and `galignable.ts:41-44`
- **What's wrong:** The trait-mixin pattern the entire GModel builder API rests on works only by escaping TypeScript's `protected` modifier via string indexing, and on incomplete input it warns to `console` from library code and invents a coordinate instead of failing.
- **Direction:** A real mixin, or a protected accessor the traits are allowed to use — and explicit `undefined` handling with no `console` in the graph package.
- **Size:** M

### A2-14 · Disposing a client session leaves its container and every service in it alive

- **Location:** `packages/server/server/src/common/session/client-session.ts:57-61` (disposes only the action dispatcher, behind a `Disposable.is` sniff) · container created at `packages/server/server/src/common/session/client-session-factory.ts:62-67` · `packages/server/server/src/common/session/client-session-manager.ts:147-157` · `dispose` absent from the interface at `packages/server/server/src/common/actions/action-dispatcher.ts:43` though implemented at `:155,413`
- **What's wrong:** Session disposal never unbinds the child container or disposes any other `Disposable` bound in it, and the one service it does dispose is found by a runtime type sniff because the interface doesn't declare `dispose` — so any adopter service holding per-session resources leaks for the lifetime of the process.
- **Direction:** Dispose the session container and every `Disposable` in it from `ClientSession.dispose`, and make the lifecycle explicit in the interfaces.
- **Size:** M

### A2-15 · Two exported service identifiers are never bound, and one's description names a different symbol

- **Location:** `packages/server/server/src/common/features/navigation/navigation-target-provider.ts:18` (`Symbol('NavigationTargetProviders')`) · `packages/server/server/src/common/features/directediting/context-edit-validator.ts:21` · vs the identifiers actually bound at `packages/server/server/src/common/di/service-identifiers.ts:31,35` and used at `di/diagram-module.ts:180,187`
- **What's wrong:** `NavigationTargetProvider` and `ContextEditValidator` are exported as service identifiers that nothing binds or injects, and `NavigationTargetProvider`'s symbol description is `'NavigationTargetProviders'` — so an adopter who binds the wrong one gets a silent no-op and a symbol indistinguishable from the real one in every DI diagnostic.
- **Direction:** Delete the unused identifiers, or make them the real ones, and give each symbol a description matching its name.
- **Size:** S

---

## Appendix — remaining observations

- `DefaultToolPaletteItemProvider.create` never increments `this.counter`, so every palette item is emitted with the id `palette-item0` — live defect (`features/contextactions/tool-palette-item-provider.ts:64,68,86`).
- `ArgsUtil.getNumber`/`getBoolean` test truthiness, so `0` and `false` are reported as absent; `getEdgeSourcePoint`/`getEdgeTargetPoint` therefore return `undefined` for any point on an axis (`utils/args-util.ts:69,78,89-97`).
- `GModelFactory.createModel(): void` is synchronous while `SourceModelStorage.loadSourceModel` is `MaybePromise<void>` — an adopter whose model derivation is async has no supported path (`features/model/gmodel-factory.ts:49` vs `source-model-storage.ts:40`).
- `ModelState.sourceUri` is a writable property on the interface but a getter-only accessor on the default implementation — assigning through the interface throws in strict mode (`features/model/model-state.ts:33` vs `:74-76`). Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `ModelState`'s `set` / `get<P>` / `setAll` / `clear` form an untyped string-keyed property bag that casts without a guard (`features/model/model-state.ts:26-29,66-72`).
- `AbstractModelValidator.validate(elements, reason: string): Marker[]` is stricter and less async than the `ModelValidator.validate(elements, reason?): MaybePromise<Marker[]>` it implements (`features/validation/model-validator.ts:35` vs `:40`).
- `GLSPServer.shutdown` is documented as leaving the server disposed and unusable, but `DefaultGLSPServer.shutdown` clears `initializeResult`, making the server re-initializable (`packages/common/protocol/src/client-server-protocol/glsp-server.ts:83-90` vs `packages/server/server/src/common/protocol/glsp-server.ts:238-247`).
- `ClientSessionManager.removeListener` returns `.every(removed => removed)` across every client bucket, so it returns `false` whenever the listener was not registered for _every_ client id — contradicting its own doc (`session/client-session-manager.ts:173-177,86-92`).
- `GModelIndex.get` is documented as returning an optional element but throws via `getOrThrow`, and `findParentElement` then performs a dead `element ? ... : undefined` check on the result (`features/model/gmodel-index.ts:78-86,178-181`).
- `GModelIndex.find`'s condition `element && predicate ? predicate(element) : true` binds as `(element && predicate) ? ... : true` — correct today only by accident (`features/model/gmodel-index.ts:64`).
- `ContextActionsProviderRegistry` registers by `contextId` through `Registry.register`, which rejects duplicates with a `logger.warn` — two providers for one context silently lose one (`features/contextactions/context-actions-provider-registry.ts:36-45`, `utils/registry.ts:43-50`).
- `applyBindingTarget` returns fabricated no-op binding syntaxes that `console.warn` or throw a synthetic `NoOpInvocation` when `.when*()`/`.in*Scope()` is called after a `toService`/`toConstantValue` target (`di/binding-target.ts:120-185`).
- Two parallel binding-helper vocabularies ship side by side through the server barrel: `bindOrRebind`/`lazyBind`/`bindAsService` (`packages/common/protocol/src/di/inversify-util.ts:49-111`) and `BindingTarget`/`applyBindingTarget` (`di/binding-target.ts:31-74`).
- Module method visibility is inconsistent: `ServerModule.configure` is public and reads `this.context`, `DiagramModule.configure` is protected and rebuilds `{bind, isBound}`, and `configureClientSessionInitializers` is public while every sibling `configureXxx` is protected (`di/server-module.ts:70-71`, `di/diagram-module.ts:134-136,201,206`).
- `GLSPModule.CLIENT_ACTIONS` and `ServerModule.DIAGRAM_MODULES` are exported string constants that nothing in the workspace references (`di/glsp-module.ts:37`, `di/server-module.ts:47`).
- Java-port leftovers in public TSDoc: `DiagramConfiguration.typeMapping` explains itself in terms of GSON and `EClass` (`diagram/diagram-configuration.ts:90-96`), `GModelIndex.typeCount` documents an `eClass` parameter that does not exist (`features/model/gmodel-index.ts:128-137`), `AbstractModelValidator` carries HTML `<p>`/`<code>` Javadoc (`features/validation/model-validator.ts:57-105`).
- `packages/server/server/package.json:48,52` sets `"main": "./lib/node/index"` but `"types": "lib/common/index"`, so the declared type surface of the default entry point is strictly smaller than what it exports at runtime.
- `createAppModule` is exported under one name from two entry points with incompatible signatures — `LaunchOptions` (`src/node/di/app-module.ts:24`) vs `LoggerConfigOptions` (`src/browser/di/app-module.ts:21`).
- `packages/server/server/src/common/gmodel/gmodel-create-edge-operation-handler.ts:18` deep-imports `@eclipse-glsp/graph/lib/gnode` for a symbol the graph barrel exports.
- `JsonCreateNodeOperationHandler` (`operations/json-operation-handler.ts:100-150`) and `GModelCreateNodeOperationHandler` (`gmodel/gmodel-create-node-operation-handler.ts:65-115`) duplicate ~50 lines of extension points verbatim — a fix to one never reaches the other.
- `OperationHandler.handles` returns `this.modelState.root && operation.kind === this.operationType`, declared `boolean` but `undefined` before the first model load (`operations/operation-handler.ts:72-73`).
- `layout-elk`'s barrel re-exports `LayoutOptions` from `elkjs`, putting a third-party type into the package's public API (`packages/server/layout-elk/src/reexport.ts:16`, `index.ts:20`).
- `LayoutEngine.layout` returns the `GModelRoot`, but both in-tree callers ignore it and the ELK engine mutates in place — the contract's return channel is decorative (`features/layout/layout-engine.ts:29`, `features/model/model-submission-handler.ts:150`, `features/layout/layout-operation-handler.ts:60`).
- `CompoundCommand.execute` stops rolling back at the first non-undoable command, leaving a partially applied compound operation with no signal (`command/command.ts:82-91`). Adjacent to [#1632](https://github.com/eclipse-glsp/glsp/issues/1632).
- `packages/common/protocol/src/re-exports.ts:54-58` re-exports whole sprotty modules (`sprotty-protocol/lib/utils/async`, `.../geometry`, `.../json`) wholesale, so sprotty additions silently become GLSP protocol API.
- `GEdge.is` is the only namespace type guard among the GModel element types and it is deprecated, while trait guards use a different `isGXxx(element)` convention (`graph/src/gedge.ts:31-36` vs `gbounds-aware.ts:27`) — there is no consistent guard story for `GNode`/`GLabel`/`GPort`/`GCompartment`. Adjacent to [#1747](https://github.com/eclipse-glsp/glsp/issues/1747).
