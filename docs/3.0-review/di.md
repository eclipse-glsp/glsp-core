# A3 — DI & module architecture

Surface swept: every DI construct across `packages/**/src` and `examples/**/src` — container creation, `ContainerModule`
and `FeatureModule` composition, the two `TYPES` / service-identifier tables, binding contexts and helpers,
multi-injection, scopes, container hierarchies, and the extension paths available to an adopter.

The Inversify 8 upgrade ([#1740](https://github.com/eclipse-glsp/glsp/issues/1740)) is a technical migration and is
**not** in scope here. Everything below is a problem with how DI is _used_ that would remain on any Inversify version.

Every finding below was verified against the source.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A3-1 · Client and server are two unrelated DI frameworks that share four helper functions

- **Location:** `packages/server/server/src/common/di/diagram-module.ts:130` · `packages/client/client/src/default-modules.ts:67` · `packages/common/protocol/src/di/container-configuration.ts:31` (`initializeContainer`, used only by `selection-service.spec.ts:66`)
- **What's wrong:** The client composes with `FeatureModule` plus `ContainerConfiguration` (`add`/`remove`/`replace`, `featureId`, `requires`); the server composes with abstract classes and ~40 `bindXxx()`/`configureXxx()` template methods, with no feature ids, no `replace`, no `requires`, and `ServerModule.configureDiagramModule(module, ...additional)` as the only composition point. An adopter who learns one half learns nothing about the other, and the shared package's own container entry point is unused outside a spec.
- **Direction:** Pick one composition model for 3.0 and express the other side in it — e.g. make the server's `DiagramModule` a `FeatureModule` producer so `ContainerConfiguration` works on both sides.
- **Size:** L
- **Adjacent to:** [#1742](https://github.com/eclipse-glsp/glsp/issues/1742) — that issue covers _how_ feature modules are configured; this is the server having no feature-module concept at all.

### A3-2 · `LazyInjector` has institutionalized the service locator, with `TYPES.EmptyArray` injected to satisfy inversify

- **Location:** `packages/client/glsp-sprotty/src/types.ts:30` (`EmptyArray`, with its explanatory comment) · `packages/client/client/src/base/default.module.ts:151` · `base/view/mouse-tool.ts:45,50` · `base/view/key-tool.ts:25` · `base/action-handler-registry.ts:28-29,47-52` · `base/ui-extension/ui-extension-registry.ts:26` · `base/tool-manager/tool-manager.ts:102-107` · `base/editor-context-service.ts:170-175`
- **What's wrong:** Five core registries take `@inject(TYPES.EmptyArray)` — a symbol bound to `[]` purely to satisfy a superclass constructor — and then harvest their real contributions later via `lazyInjector.getAll(...)` inside `preLoadDiagram`. Contribution sets are therefore frozen at one arbitrary point in the load sequence, invisible to the container's dependency graph, and impossible to inspect or validate; 15 client files depend on `LazyInjector` despite its own doc saying "use with caution".
- **Direction:** Break the actual cycle (dispatcher ↔ registry ↔ handlers) by inverting registration — handlers register themselves through a contribution binding — rather than papering over it with a container handle.
- **Size:** L

### A3-3 · `DefaultLazyInjector` shares one cache between `get` and `getAll`, and caches misses forever

- **Location:** `packages/common/protocol/src/di/lazy-injector.ts:80,93-99,104-108`
- **What's wrong:** `getOptional` stores a single instance under the service identifier while `getAll` returns `cache.get(id) as T[]` without checking what shape was cached — so `get(X)` followed by `getAll(X)` hands back a single object typed as an array. `undefined`/`[]` is also cached permanently, so anything bound after the first lookup is invisible. This is a live defect.
- **Direction:** Key the cache by `(identifier, mode)` and stop memoizing misses.
- **Size:** S

### A3-4 · `applyBindingTarget` fabricates a fake fluent binding syntax, so declared scope is a suggestion

- **Location:** `packages/server/server/src/common/di/binding-target.ts:120-184` (`NoOPSyntax`) · consumed at `packages/server/server/src/common/di/diagram-module.ts:139-198`
- **What's wrong:** `DiagramModule` writes `.inSingletonScope()` at ~15 call sites, but the returned object is a stub whose behaviour depends on what the subclass returned: for a `ConstantValueTarget` it `console.warn`s, for a `ServiceTarget` it silently returns itself, and `.when*()`/`.inTransientScope()` on a `toService` target throws a synthetic `NoOpInvocation` at container-load time. The declared return type `interfaces.BindingInWhenOnSyntax<T>` is not what is returned.
- **Direction:** Make the binding target carry its own scope (`{ service: X, scope: 'singleton' }`) and have `applyBindingTarget` return `void`, so scope is stated once, where the binding kind is known.
- **Size:** M

### A3-5 · Three mutually incompatible multi-binding mechanisms, because scope is not part of the abstraction

- **Location:** `packages/server/server/src/common/di/multi-binding.ts:73` (`MultiBinding` — transient, real multi-injection), `:85` (`InstanceMultiBinding` — binds **one array** as a constant value) · `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:93` (`McpHandlerMultiBinding` — singleton plus `toService`), with the explanatory comment at `:88-91`
- **What's wrong:** `InstanceMultiBinding` is not multi-injection at all — consumers do `container.get<X[]>(Id)` (`diagram-module.ts:279`), so a second module contributing to the same identifier produces an ambiguous-match error rather than more contributions. All three classes are structurally identical, so TypeScript cannot tell them apart at the `configureMultiBinding` call sites, which is why `mcp-diagram-module.ts:109,113,117` need `as` casts.
- **Direction:** One multi-binding type with explicit scope and aggregation options, and a `configureMultiBinding` signature that preserves the concrete binding type.
- **Size:** M
- **See also:** [api-server.md](api-server.md) A2-3 and A2-4 — the same mechanism seen from the extension-point side.

### A3-6 · There is no diagram-type-level metadata, so three places materialize a fake session to read static information

- **Location:** `packages/server/server/src/common/actions/global-action-provider.ts:41-51` · `packages/server/server-mcp/src/common/server/mcp-diagram-handler-dispatcher.ts:120-149` · `packages/server/server-mcp/src/common/tools/handlers/element-types-mcp-tool-handler.ts:135-153` · sentinel at `common/di/client-session-module.ts:33` (`TEMPORARY_CLIENT_ID = 'tempId'`), branched on at `mcp-diagram-tool-handler-registry.ts:77`
- **What's wrong:** Answering "which action kinds / element types / handlers does diagram type X support?" requires building a child container, loading every diagram module plus a placeholder session module, running every `ClientSessionInitializer`, reading one value, and calling `unbindAll()`. The probe is signalled by a magic client id that handlers branch on — and the third probe site uses the literal `'mcp-element-types-temp'` instead, so that branch silently does not apply there.
- **Direction:** Let a diagram module declare its static capabilities without instantiation, so probe containers and sentinel client ids disappear.
- **Size:** L
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741).

### A3-7 · The container itself is a bound service whose meaning depends on who asks

- **Location:** `packages/server/server/src/common/di/service-identifiers.ts:25` · bound at `node/di/app-module.ts:26` and `browser/di/app-module.ts:24`, **and again** at `server-module.ts:86-88` behind an `isBound` guard · injected at `client-session-factory.ts:45`, `global-action-provider.ts:37`, `glsp-server-launcher.ts:30`, `mcp-diagram-handler-dispatcher.ts:96`, `element-types-mcp-tool-handler.ts:72`
- **What's wrong:** `InjectionContainer` is `toDynamicValue(ctx => ctx.container)` — "whatever container started this resolution". It is named `serverContainer` at every injection site but would be the _session_ container if the consumer were ever resolved from one, and the same concern is bound in two different modules behind a defensive `isBound` check to stop them colliding.
- **Direction:** Replace the generic container handle with narrow, purpose-named services (a `SessionContainerFactory`, a `DiagramModuleRegistry`), so no component holds the container.
- **Size:** M

### A3-8 · `TYPES` is a grab bag with dead entries, and half the client's services are not in it

- **Location:** `packages/client/glsp-sprotty/src/types.ts:25-73`
- **What's wrong:** `TYPES` spreads Sprotty's table and adds 35 mixed entries — services, listeners, tools, UI options (`Grid`, `ZoomFactors`, `IHelperLineOptions`), an inversify workaround (`EmptyArray`) and deprecated aliases. `IToolFactory` and `ISModelRootListener` are referenced nowhere; `IMovementOptions` is injected (`change-bounds-tool.ts:98`) but never bound. Meanwhile ~25 other services are identified by their concrete class (`EditorContextService` is injected 23 times, `SelectionService` 15), so there is no rule an adopter can apply to know which identifier to rebind.
- **Direction:** One stated convention — symbol per contract, class only for leaf implementations — a `TYPES` grouped by concern, and deletion of the entries nothing uses.
- **Size:** M
- **See also:** [layering.md](layering.md) A5-7 — the same table, seen as a layering problem.

### A3-9 · Module load order is load-bearing everywhere, and every ordering failure is silent

- **Location:** `packages/common/protocol/src/di/feature-module.ts:86` (unmet `requires` → `return false`, no warning unless `DEBUG_LOG_ENABLED`) · `packages/client/client/src/default-modules.ts:178-183` (hard-coded "defaultModule must be first" check) · `examples/workflow-glsp/src/workflow-diagram-module.ts:96` (`bindOrRebind(ISnapper)` only rebinds because `gridModule` at `:110` is listed earlier) · `base/model/model-registry.ts:35` and `base/view/view-registry.ts:32` (duplicate registration = last wins plus a `console.log`)
- **What's wrong:** Thirteen modules declare `requires`, and an unmet requirement makes the module quietly do nothing; `bindOrRebind` degrades to a plain `bind` when it runs first, turning an intended rebind into a duplicate binding; and model/view registration resolves conflicts by overwriting with a console message. The correctness of a container therefore depends on the order of an array the adopter can freely rearrange.
- **Direction:** Resolve module order from the declared `requires` graph instead of trusting array position, and fail loudly on unmet requirements and duplicate element-type registrations.
- **Size:** M
- **Adjacent to:** [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).

### A3-10 · Accessibility features exist twice — as six `FeatureModule`s nobody loads and as six `configure*` functions

- **Location:** `packages/client/client/src/features/accessibility/accessibility-module.ts:28-36` · `view-key-tools/view-key-tools-module.ts:23` (module, `requires: viewportModule`) vs `:34` (`configureViewKeyTools`) · plus `toast-module.ts:25`, `focus-tracker-module.ts:24`, `element-navigation-module.ts:26`, `keyboard-module.ts:43`, `keyboard-tool-palette-module.ts:32`
- **What's wrong:** `accessibilityModule` calls the `configure*` functions directly, so the six exported feature modules are referenced nowhere — their `featureId`s are never bound and their `requires: viewportModule` guard is bypassed — and an adopter who loads one alongside `accessibilityModule` gets every binding applied twice, hence ambiguous resolution.
- **Direction:** Keep one surface per feature — either the modules compose and the functions are internal, or drop the modules.
- **Size:** S
- **Adjacent to:** [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).

### A3-11 · Scope by omission: services that read as singletons are transient

- **Location:** `packages/client/client/src/features/bounds/bounds-module.ts:63` (`PositionSnapper`) · `features/copy-paste/copy-paste-modules.ts:22` (`ICopyPasteHandler`) · `features/grid/grid-module.ts:35` (`ISnapper`) · `features/context-menu/context-menu-module.ts:32` (`IContextMenuProviderRegistry` — a _registry_) · `features/change-bounds/resize/resize-module.ts:43,45` · `features/viewport/viewport-modules.ts:64,67` · `examples/workflow-glsp/src/workflow-diagram-module.ts:96` · server side `packages/server/server/src/common/di/diagram-module.ts:147` (`GModelFactory`, the only unscoped binding among its neighbours)
- **What's wrong:** Nine bindings use `.to(X)` with no scope while their immediate neighbours in the same file say `.inSingletonScope()`. There is no stated default, so whether two injection sites share an instance is decided per line and by accident — and a registry bound transiently is a hazard the moment anyone registers into it.
- **Direction:** State the default (singleton for services, transient only where deliberate) and let `bindAsService`/`applyBindingTarget` enforce it rather than leaving it to each call site.
- **Size:** S

### A3-12 · A per-session concern is bound in the app module, with scope substituting for a missing lifetime

- **Location:** `packages/server/server/src/browser/di/app-module.ts:25-27` (comment: "Transient on purpose: a singleton at the server-container level would be shared across sessions and leak the browser flag between them") vs `packages/server/server/src/node/di/app-module.ts:27` (`.inSingletonScope()`) · consumed at `common/actions/action-dispatcher.ts:170`
- **What's wrong:** `ActionDispatchScope` is per-session state bound two container levels up in the platform app module; because no session-scope binding site exists there, the browser variant uses transient scope to approximate "one per dispatcher", and node and browser end up with different sharing semantics for the same identifier.
- **Direction:** Bind session-lifetime services in the session container via a platform hook on `DiagramModule`, so scope expresses sharing rather than substituting for a missing lifetime.
- **Size:** S

---

## Recorded elsewhere

These surfaced in this lens but are owned by another file, to avoid duplicate findings:

- **Diagram containers are never torn down, so every client `@preDestroy` is dead code** — [client-runtime.md](client-runtime.md) A6-8. Verified: zero `unbindAll`/`unload` calls across `packages/client`, `examples` and `e2e`.
- **`MarkerNavigatorContextMenuItemProvider` is bound to a shadow symbol nothing injects** — [api-client.md](api-client.md) A1-2.
- **`@eclipse-glsp/protocol/lib/di` is the de-facto public DI API but is not in the barrel** — [api-server.md](api-server.md) A2-1.
- **Server session containers are disposed only in name** — [api-server.md](api-server.md) A2-14 and [server-runtime.md](server-runtime.md) A7-1. This lens adds: the connection-level container _is_ `unbindAll()`'d by the launcher (`common/launch/jsonrpc-server-launcher.ts:142-147`), the opposite convention one level up, and the server uses zero `@preDestroy` anywhere.
- **`bindOperations` instantiates handlers with `new` outside the container** — [api-server.md](api-server.md) A2-5.
- **`layout-elk` resolves four services by hand and skips property injection** — [api-server.md](api-server.md) A2-9.

---

## Appendix — remaining observations

- Module instances carry mutable binding state: `GLSPModule.context` is assigned inside the `super()` callback (`common/di/glsp-module.ts:41-46`) and read later by `configureMultiBinding` (`:66`) and `ServerModule.configure` (`server-module.ts:71`); `AbstractMcpDiagramModule` repeats this with `this.bind`/`this.rebind` fields (`mcp-diagram-module.ts:92-102`). The same module instance is loaded into probe containers _and_ session containers, so those fields point at whichever container loaded last.
- `GLSPModule` is decorated `@injectable()` (`glsp-module.ts:35`), as is every subclass (`gmodel-diagram-module.ts:51`, `layout-elk/src/di.config.ts:79`, `examples/workflow-server/src/common/workflow-diagram-module.ts:63,70`), although container modules are never resolved from a container.
- `packages/common/protocol/src/di/re-decorate.ts:22` retro-decorates `JsonrpcClientProxy` as `@injectable()` as an import side effect — DI correctness depends on someone having imported the barrel first. See also [layering.md](layering.md) A5-8.
- The binding-context parameter has five different shapes across helpers: `BindingContext`, `Pick<BindingContext,'bind'|'isBound'>`, `Pick<…,'bind'>`, an inline `{bind, isBound}`, and `context | interfaces.Bind` unions (`inversify-util.ts:49,76,103`, `binding-target.ts:32`, `lazy-injector.ts:112`, `views/base-view-module.ts:64`); the server keeps a deprecated duplicate interface `ModuleContext` (`glsp-module.ts:25`), and `examples/workflow-standalone/src/common/di.config.ts:47` passes a raw `Container` where a context is expected.
- `ElkLayoutModule.bindLoggerFallbacks` (`layout-elk/src/di.config.ts:152-163`) conditionally binds `Logger`/`LoggerFactory` owned by another layer, while `configureWinstonLogger` (`node/di/app-module.ts:79-86`) unbinds them — `Logger` is bound or unbound in four production code paths with three different strategies. Adjacent to [#1583](https://github.com/eclipse-glsp/glsp/issues/1583).
- `Logger` is bound `toDynamicValue` deriving its `caller` from the inversify request tree (`node/di/app-module.ts:101`, `console-logger.ts:92`, `utils/logger.ts:76`), which makes it silently useless whenever obtained via `container.get(Logger)` (`abstract-mcp-server-module.ts:243`, `app-module.ts:88`). Adjacent to [#1583](https://github.com/eclipse-glsp/glsp/issues/1583).
- `ValidateLabelEditAdapterFactory` (`common/di/service-identifiers.ts:33`) is declared as both a symbol and a type and is never bound or injected; `GLSPModule.CLIENT_ACTIONS` (`glsp-module.ts:37`) is likewise dead.
- Three singular/plural symbol pairs coexist where only the plural is a real identifier: `ContextActionsProvider` vs `ContextActionsProviders`, `NavigationTargetProvider` — declared as `Symbol('NavigationTargetProviders')`, the _same description_ as the other symbol — vs `NavigationTargetProviders`, and `ContextEditValidator` vs `ContextEditValidators`.
- `WorkflowDiagramModule` satisfies the base class's `protected abstract bindSourceModelStorage()` with a **public constructor field** holding a closure (`examples/workflow-server/src/common/workflow-diagram-module.ts:72`) — the template-method binding API has no way to parameterize a module, so adopters overload method slots.
- Server launchers are obtained with `appContainer.resolve(...)` rather than `get` (`examples/workflow-server/src/node/app.ts:60,64`), so they are unbound instances no module can substitute.
- Contribution ordering is expressed as unscoped magic numbers relative to `Ranked.DEFAULT_RANK`: `-200` (`base/mouse-position-tracker.ts:24`), `-100` (`base/tool-manager/tool-manager.ts:118-120`, `features/select/select-mouse-listener.ts:29`), `-10` (`features/hints/type-hint-provider.ts:82`), with no registry of who occupies which band.
- `DiagramLoader.load` sorts `this.diagramStartups` in place (`base/model/diagram-loader.ts:177`), mutating the array cached inside `DefaultLazyInjector`.
- Optionality is re-encoded at every injection site rather than once: ~40 `@optional()` in the client and ~25 on the server, including four in one constructor at `features/tools/change-bounds/change-bounds-manager.ts:188-191`.
- `@multiInject(TYPES.IDiagramExporter)` at `features/export/diagram-export-postprocessor.ts:40` omits `@optional()`, so removing the default exporters makes the postprocessor unresolvable.
- Client contribution harvesting is pull-based via `LazyInjector` while server harvesting is push-based via constructor `@multiInject` (`features/contextactions/context-actions-provider-registry.ts:30`, `navigation/navigation-target-provider-registry.ts:32`, `directediting/context-edit-validator-registry.ts:34`, `protocol/glsp-server.ts:68-69`) — two opposite answers to one problem in one repo.
- `bindAsService` (`inversify-util.ts:103`) deliberately creates two identifiers per service, and framework code then injects the concrete one (`features/tools/base-tools.ts:62-63` injects `GLSPMouseTool`/`GLSPKeyTool` while `default.module.ts:99,104` aliases `MouseTool`/`KeyTool` to them) — replacing such a service requires rebinding both.
- `TYPES.IEditorContextServiceProvider` and `TYPES.ActionHandlerRegistryProvider` are marked deprecated (`types.ts:31-35`) yet still bound (`default.module.ts:80`) and still injected (`base/action-dispatcher.ts:51`). Adjacent to [#1747](https://github.com/eclipse-glsp/glsp/issues/1747).
- `initializeContainer` (`protocol/src/di/container-configuration.ts:31`) collides by name with `GLSPAbstractUIExtension.initializeContainer(HTMLElement)` (`base/ui-extension/ui-extension.ts:93`).
- `resolveContainerConfiguration` handles a `replace` whose target is absent by `console.warn`ing and appending at the end (`container-configuration.ts:63-69`) — a failed replace silently becomes an add at the least useful position. Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
