# Server: `packages/server/*`

Surface swept: `packages/server/server`, `packages/server/graph`, `packages/server/layout-elk`,
`packages/server/server-mcp` (~26k LOC), plus every DI construct and import edge originating in them.

`layout-elk` and `server-mcp` are treated as the in-tree stand-ins for an external adopter: where they have to reach
past the server's public API, that is evidence about the API.

**28 findings** (`SRV-1` and `SRV-19` [withdrawn](#withdrawn), hence the gaps). Unless a location starts with `packages/`, paths are relative to `packages/server/server/src/`.

The wire contract itself is in [protocol.md](protocol.md); anything the server shares with the client is in
[cross-cutting.md](cross-cutting.md).

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

**Triage is complete.** Every finding is filed under [#1816](https://github.com/eclipse-glsp/glsp/issues/1816), itself a sub-issue of [#1744](https://github.com/eclipse-glsp/glsp/issues/1744), in 12 issues. Findings in the same cluster share one issue; each finding's `Filed as` line names it. The candidate issues in the appendix are **not** triaged and are still worth a pass.

---

## Public API and extension points

### SRV-2 · Action and operation handlers can only be contributed by subclassing `DiagramModule`

> Filed as [#1799](https://github.com/eclipse-glsp/glsp/issues/1799), together with SRV-4, SRV-5, SRV-6, SRV-7.

- **Location:** `common/di/diagram-module.ts:166-172` (`toConstantValue(array)`) · `common/actions/action-handler-registry.ts:49-51` (`@inject`, not `@multiInject`) · worked around at `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:154-155`
- **What's wrong:** Handler lists are bound as a single constant array injected with `@inject`, so a second `ContainerModule` cannot append a handler, only collide with the existing binding; the sole additive path is overriding `configureActionHandlers` / `configureOperationHandlers` in a `DiagramModule` subclass, which is why the MCP module drops to raw `bind().toService()` with an explanatory comment.
- **Direction:** A contribution point usable from any module: `multiInject` with per-module binds, or a registry API mirroring the client's `FeatureModule` and `ContainerConfiguration`.
- **Size:** L
- **Cluster:** [handler contribution](#cluster-handler-contribution)
- **See also:** [X-1](cross-cutting.md#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision).

### SRV-3 · `MultiBinding` has no scope control and erases its own type, so the one adopter reimplemented it

> Filed as [#1800](https://github.com/eclipse-glsp/glsp/issues/1800), together with SRV-24, SRV-25, SRV-27.

- **Location:** `common/di/multi-binding.ts:73-77` · `common/di/glsp-module.ts:64-67` · reimplemented at `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:93-102`, with casts at `:164-172` and `packages/server/server-mcp/src/common/modules/mcp-diagram-module.ts:108-118`, and `bind`/`rebind` cached as fields at `mcp-diagram-module.ts:92-93,101-102`
- **What's wrong:** `applyBindings` binds transient with no way to choose scope, and `configureMultiBinding<T>` erases the binding subtype, so `server-mcp` wrote its own `McpHandlerMultiBinding`, casts every configurator argument back, and stashes `bind`/`rebind` because `GLSPModule` exposes no binding context.
- **Direction:** Scope-aware multi-binding, generic over the binding type, plus a public accessor for the module's `BindingContext`.
- **Size:** M
- **Cluster:** [DI and binding mechanics](#cluster-di-and-binding-mechanics)
- **See also:** [SRV-25](#srv-25--three-mutually-incompatible-multi-binding-mechanisms-because-scope-is-not-part-of-the-abstraction). The same mechanism from the DI side.

### SRV-4 · `bindOperations` instantiates every operation handler with `new` outside the container

> Filed as [#1799](https://github.com/eclipse-glsp/glsp/issues/1799), together with SRV-2, SRV-5, SRV-6, SRV-7.

- **Location:** `common/di/diagram-module.ts:276-282` · trick copied at `packages/server/server-mcp/src/common/mcp-tool-handler.ts:456-460`
- **What's wrong:** `new constructor().operationType` runs each handler's constructor with no DI and no arguments purely to read a string, which silently constrains every operation handler to a zero-argument constructor and a constructor-time-constant `operationType`. That is a contract that is neither stated nor enforceable.
- **Direction:** Declare the operation type as a static field on the constructor, or read it from the already-resolved registry instead of a throwaway instance.
- **Size:** M
- **Cluster:** [handler contribution](#cluster-handler-contribution)

### SRV-5 · `CreateOperationHandler.is` demands `instanceof` a class the type only describes structurally

> Filed as [#1799](https://github.com/eclipse-glsp/glsp/issues/1799), together with SRV-2, SRV-4, SRV-6, SRV-7.

- **Location:** `common/operations/create-operation-handler.ts:67-77` · consumed at `common/operations/operation-handler-registry.ts:25-32` and `common/features/contextactions/tool-palette-item-provider.ts:67`
- **What's wrong:** `CreateEdgeOperationHandler` and `CreateNodeOperationHandler` are _interfaces_, so a handler can satisfy the type without extending `OperationHandler`. The guard then rejects it, it is registered under a key without the `_elementTypeId` suffix, and it silently disappears from the tool palette with no error anywhere.
- **Direction:** Make the create-handler contract structural end to end (drop the `instanceof`), or make the abstract class the only declared way to implement it.
- **Size:** S
- **Cluster:** [handler contribution](#cluster-handler-contribution)

### SRV-6 · The documented `ActionHandler.priority` ordering never takes effect

> Filed as [#1799](https://github.com/eclipse-glsp/glsp/issues/1799), together with SRV-2, SRV-4, SRV-5, SRV-7.

- **Location:** `common/actions/action-handler-registry.ts:40` · contract documented at `common/actions/action-handler.ts:44-53`
- **What's wrong:** `a.priority ?? 0 - (b.priority ?? 0)` parses as `a.priority ?? (0 - (b.priority ?? 0))` because `??` binds looser than `-`, so the comparator returns `a`'s priority instead of a difference, and the documented "descending priority, handlers > 0 run first" contract is not what the code does. This is a live defect.
- **Direction:** Fix the comparator and add the ordering test; 3.0 is also the moment to decide whether priority stays an untyped optional number.
- **Size:** S
- **Cluster:** [handler contribution](#cluster-handler-contribution)

### SRV-7 · `GModelOperationHandler` is missing its decorator, because `injectable();` is a bare call

> Filed as [#1799](https://github.com/eclipse-glsp/glsp/issues/1799), together with SRV-2, SRV-4, SRV-5, SRV-6.

- **Location:** `common/gmodel/gmodel-operation-handler.ts:23`
- **What's wrong:** The `@` is missing, so the base class of every GModel operation handler is undecorated; this works today only because each concrete subclass carries its own `@injectable()`, and an adopter who omits one gets an opaque inversify resolution failure. This is a live defect.
- **Direction:** Restore the decorator, and lint for bare decorator-shaped call expressions.
- **Size:** S
- **Cluster:** [handler contribution](#cluster-handler-contribution)

### SRV-8 · `layout-elk` cannot use the server's own DI, and its injected logger is never populated

> Filed as [#1801](https://github.com/eclipse-glsp/glsp/issues/1801), together with SRV-9.

- **Location:** `packages/server/layout-elk/src/di.config.ts:139-149` (`dynamicValue` manually resolving four services and `new`-ing the engine) · `packages/server/layout-elk/src/glsp-elk-layout-engine.ts:54-55` (`@inject(Logger) protected readonly logger`) used at `:135`
- **What's wrong:** `GlspElkLayoutEngine` takes constructor parameters the framework's binding helpers cannot supply, so the module constructs it by hand. That skips property injection, leaves `this.logger` undefined, and turns the "multiple sources or targets" warning path into a `TypeError`. This is a live defect.
- **Direction:** Make the engine fully property-injected, or give `BindingTarget` a first-class way to pass constructor arguments, so the in-tree adopter uses the DI path the framework documents for everyone else.
- **Size:** S
- **Cluster:** [layout-elk](#cluster-layout-elk)

### SRV-9 · `layout-elk`'s documented override points for labels and ports are dead code

> Filed as [#1801](https://github.com/eclipse-glsp/glsp/issues/1801), together with SRV-8.

- **Location:** `packages/server/layout-elk/src/element-filter.ts:51-55` (`this.filterLabel(element);`, whose result is discarded, falling through to `return true`) · identical shape at `packages/server/layout-elk/src/layout-configurator.ts:52-56` (falls through to `return undefined`)
- **What's wrong:** Both classes document these methods as _the_ customization hook, but the missing `return` means overriding `filterLabel`, `filterPort`, `labelOptions` or `portOptions` has no observable effect whatsoever. This is a live defect.
- **Direction:** Return the values; the duplicated `instanceof` dispatch across both classes is also a candidate for one shared visitor.
- **Size:** S
- **Cluster:** [layout-elk](#cluster-layout-elk)

### SRV-10 · The GModel builder family is inconsistent type by type, and two builders silently drop `0`

> Filed as [#1802](https://github.com/eclipse-glsp/glsp/issues/1802), together with SRV-11, SRV-12, SRV-22.

- **Location:** `packages/server/graph/src/gport.ts:21` (generic builder, no dedicated one) · `gbutton.ts:21`, `glabel.ts:23` (optional constructor parameter) vs `gnode.ts:22`, `gedge.ts:20`, `gcompartment.ts:21` (none) · `gmodel-element.ts:99-102` (`reset()` drops the constructor's invariants, so `build()` then throws) · `gmodel-element.ts:104-107` (`Object.assign` shares `children`/`args` between built element and proxy) · `gedge.ts:69` (`else if (y)` discards `addRoutingPoint(x, 0)`) · `gissue-marker.ts:34` (`else if (severity)` discards the issue)
- **What's wrong:** Six different builder shapes, a `reset()` that yields an unbuildable builder, aliasing between successive `build()` calls, and two fluent methods that discard valid input because they test truthiness instead of definedness.
- **Direction:** One builder contract per element type with a uniform `builder(constructor?)` signature, a `reset()` that re-runs the constructor invariants, a copying `build()`, and explicit `undefined` checks.
- **Size:** M
- **Cluster:** [the graph model](#cluster-the-graph-model)
- **See also:** [cross-cutting.md](cross-cutting.md#truthiness-instead-of-definedness).

### SRV-11 · `GShapeElement` declares `position`/`size` as always present while the trait declares them optional

> Filed as [#1802](https://github.com/eclipse-glsp/glsp/issues/1802), together with SRV-10, SRV-12, SRV-22.

- **Location:** `packages/server/graph/src/gshape-element.ts:24-25` (`position: Point; size: Dimension;`) vs `packages/server/graph/src/gbounds-aware.ts:22-23` (`position?: Point; size?: Dimension;`) · `packages/server/graph/src/ggraph.ts:34` (`size?`) · worked around at `common/gmodel/change-bounds-operation-handler.ts:42`
- **What's wrong:** `GNode.size` is typed non-optional but nothing guarantees it is set. There is no builder call and no serializer default, so server code that trusts the type reads `undefined`; the framework's own change-bounds handler already guards against it.
- **Direction:** Pick one and hold it: optional everywhere with explicit guards, or required with a builder and serializer that guarantee a value.
- **Size:** M
- **Cluster:** [the graph model](#cluster-the-graph-model)

### SRV-12 · GModel trait builders reach into a `protected` member by string index

> Filed as [#1802](https://github.com/eclipse-glsp/glsp/issues/1802), together with SRV-10, SRV-11, SRV-22.

- **Location:** `packages/server/graph/src/gbounds-aware.ts:35,51` (`const proxy = builder['proxy'];`) · same at `galignable.ts:34`, `glayoutable.ts:34,44`, `glayouting.ts:33`, `gedge-layoutable.ts:41`, `gresizable.ts:34` · plus `console.warn` and a silent `y: 0` coercion at `gbounds-aware.ts:42-45` and `galignable.ts:41-44`
- **What's wrong:** The trait-mixin pattern the entire GModel builder API rests on works only by escaping TypeScript's `protected` modifier via string indexing, and on incomplete input it warns to `console` from library code and invents a coordinate instead of failing.
- **Direction:** A real mixin, or a protected accessor the traits are allowed to use, plus explicit `undefined` handling with no `console` in the graph package.
- **Size:** M
- **Cluster:** [the graph model](#cluster-the-graph-model)

### SRV-13 · Disposing a client session leaves its container and every service in it alive

> Filed as [#1803](https://github.com/eclipse-glsp/glsp/issues/1803), together with SRV-15, SRV-18, SRV-23.

- **Location:** `common/session/client-session.ts:57-61` (disposes only the action dispatcher, behind a `Disposable.is` sniff) · container created at `common/session/client-session-factory.ts:62-67` · `common/session/client-session-manager.ts:147-157` · `dispose` absent from the interface at `common/actions/action-dispatcher.ts:43` though implemented at `:155,413`
- **What's wrong:** Session disposal never unbinds the child container or disposes any other `Disposable` bound in it, and the one service it does dispose is found by a runtime type sniff because the interface doesn't declare `dispose`. Any adopter service holding per-session resources leaks for the lifetime of the process.
- **Direction:** Dispose the session container and every `Disposable` in it from `ClientSession.dispose`, and make the lifecycle explicit in the interfaces.
- **Size:** M
- **Cluster:** [session lifecycle](#cluster-session-lifecycle)
- **See also:** [SRV-15](#srv-15--client-sessions-have-no-teardown-protocol). The runtime half; [cross-cutting.md](cross-cutting.md#lifecycle-and-disposal) for the client's matching leak.

### SRV-14 · Two extension points have no in-repo consumer and no test that exercises them through DI

> Filed as [#1804](https://github.com/eclipse-glsp/glsp/issues/1804).

- **Location:** `common/features/navigation/navigation-target-provider.ts:18` (`export const NavigationTargetProvider = Symbol('NavigationTargetProviders')`) · `common/features/directediting/context-edit-validator.ts:21` · the identifiers the framework actually binds at `common/di/service-identifiers.ts:31,35`, used at `common/di/diagram-module.ts:180,187` · tests: no spec anywhere in `packages/server/server/src` mentions `NavigationTarget`; `common/features/directediting/context-edit-validator-registry.spec.ts` constructs the registry from plain arrays
- **What's wrong:** Navigation targets and context edit validation are extension points for adopters, and nothing in this repository uses them. The Workflow example registers no provider and no validator, so the only thing that could exercise them is a test, and the tests do not. Navigation has no unit test at all. Context edit validation has a registry test that builds `DefaultContextEditValidatorRegistry` from an array, so the path an adopter takes, contributing through `configureContextEditValidators` and the `ContextEditValidators` multi-binding, is never run. A regression in either would ship. One concrete trap is already there: the exported `NavigationTargetProvider` symbol has the description `'NavigationTargetProviders'`, identical to the real `NavigationTargetProviders` identifier, so an adopter who binds the one exported next to the interface gets a silent no-op and a symbol indistinguishable from the real one in every DI diagnostic.
- **Direction:** Keep the identifiers; they are API. Add unit tests that contribute a provider and a validator the way an adopter would, through the `DiagramModule` hooks and the multi-bindings, and assert that the request handlers see them. Give `NavigationTargetProvider` a description matching its name, and say in TSDoc which identifier an adopter binds to.
- **Size:** S
- **Note:** the previous wording proposed deleting the identifiers as unused. They are unused by the Workflow example only, which is one adopter among several; see the scope caveat in [index.md](../index.md#scope).

## Runtime model

### SRV-15 · Client sessions have no teardown protocol

> Filed as [#1803](https://github.com/eclipse-glsp/glsp/issues/1803), together with SRV-13, SRV-18, SRV-23.

- **Location:** `common/session/client-session.ts:48-61` · `common/session/client-session-factory.ts:62-67` · `common/session/client-session-manager.ts:147-157` · the opposite convention one level up at `common/launch/jsonrpc-server-launcher.ts:142-147`
- **What's wrong:** `DefaultClientSession.dispose()` runtime-checks `Disposable.is(this.actionDispatcher)` and disposes that one object; the session's inversify child container is never unloaded and no other session-scoped service, meaning model state, index, command stack, storage, validators, progress monitors and adopter services, is ever told the session ended. There is a `ClientSessionInitializer` for setup with no counterpart for teardown, the server uses zero `@preDestroy` anywhere, and `DefaultClientSession` is `new`'d directly so adopters cannot substitute it. Meanwhile the _connection_-level container **is** `unbindAll()`'d by the launcher.
- **Direction:** A session-scoped disposal contract, either a `ClientSessionDisposer` multi-binding or a `DisposableCollection` owned by the session container that `disposeClientSession` drains, plus resolving the session object through DI.
- **Size:** M
- **Cluster:** [session lifecycle](#cluster-session-lifecycle)
- **See also:** [SRV-13](#srv-13--disposing-a-client-session-leaves-its-container-and-every-service-in-it-alive), which records the same gap from the API side.

### SRV-16 · The initial-model handshake is a latch, and a revision mismatch strands it permanently

> Filed as [#1805](https://github.com/eclipse-glsp/glsp/issues/1805), together with SRV-17, SRV-20.

- **Location:** `common/features/model/model-submission-handler.ts:182,201-209,224,293-298` · `common/features/layout/computed-bounds-action-handler.ts:50-61`
- **What's wrong:** The four-step exchange of `RequestModel`, `RequestBounds`, `ComputedBounds` and `SetModel` is carried by a mutable `requestModelAction?` field, and while it is set every `submitModel()` forces `revision = 0`. If `ComputedBoundsActionHandler` sees `action.revision !== model.revision` it returns `[]`, so the latch is never cleared. The client's `RequestModelAction` never resolves, and the _next_ operation emits a `SetModelAction` carrying the stale `responseId` and revision 0.
- **There is a reference implementation for the fix.** The protocol shape here is inherited: `RequestModelAction extends RequestAction<SetModelAction>, sprotty.RequestModelAction` (`action-protocol/model-data.ts:27`), and Sprotty's own `DiagramServer` runs the same exchange without a latch. It threads the causing action as a parameter, `submitModel(newRoot, update, cause?: Action)`, and correlates at the end (`sprotty-protocol/lib/diagram-server.js:212-214`: `if (cause.kind === RequestModelAction.KIND)` then `SetModelAction.create(newRoot, requestId)`), dispatching `RequestBoundsAction` as its own separate request (`:185-188`) rather than as the answer to the model request. GLSP holds the same value in a field instead, which is what makes it strandable.
- **Direction:** Thread the causing action through `submitModel` as Sprotty does, so the pending state lives in the call rather than on the singleton, and make a revision mismatch a decision rather than a silent drop.
- **Size:** M
- **Counterpart:** [PROT-11](protocol.md#prot-11--the-protocol-cannot-say-the-model-is-loaded-the-client-infers-it-and-revision-is-optional-but-required), filed as [#1774](https://github.com/eclipse-glsp/glsp/issues/1774). That issue makes `revision` required and adds the ready signal; this one is the latch that a mismatch strands. [CL-25](client.md) is the third leg.
- **Cluster:** [the model update pipeline](#cluster-the-model-update-pipeline)

### SRV-17 · Every operation serializes, deep-clones, diffs and rebuilds the entire graph model

> Filed as [#1805](https://github.com/eclipse-glsp/glsp/issues/1805), together with SRV-16, SRV-20.

- **Location:** `common/command/recording-command.ts:318-325,392-399` · `common/features/model/model-state.ts:94-100`
- **What's wrong:** `AbstractRecordingCommand.execute` snapshots the whole `GModelRoot` as JSON, runs the change, snapshots again and stores two full json-patches; then `GModelRecordingCommand.postChange` calls `serializer.createRoot(newModel)` plus `updateRoot`. After _any_ operation every `GModelElement` instance is a different object, every cached element reference held by a handler is detached, and each undo entry retains a patch proportional to the model.
- **Direction:** Record patches against the source model only, as `JsonRecordingCommand` already does, and let commands mutate the GModel in place; or make the rebuild explicit in the `Command` contract so handlers know references do not survive.
- **Size:** L
- **Cluster:** [the model update pipeline](#cluster-the-model-update-pipeline)
- **Adjacent to:** [#1251](https://github.com/eclipse-glsp/glsp/issues/1251). That issue is about the wire; this is the server-side rebuild and the identity loss it causes.

### SRV-18 · Two components own the client-session map

> Filed as [#1803](https://github.com/eclipse-glsp/glsp/issues/1803), together with SRV-13, SRV-15, SRV-23.

- **Location:** `common/protocol/glsp-server.ts:64,143-147,153-161,238-243` vs `common/session/client-session-manager.ts:109,118-133,147-157` · the listener at `client-session-manager.ts:187`
- **What's wrong:** `DefaultGLSPServer` keeps its own `clientSessions` map in addition to `DefaultClientSessionManager`'s, and `process()` resolves from the server's copy, so a session disposed through the manager directly stays live and reachable in the server's map, and `shutdown()` clears the copy with no ordering guarantee against the listener that actually disposes sessions.
- **Direction:** One owner. The server delegates every lookup to `ClientSessionManager` and keeps no map.
- **Size:** S
- **Cluster:** [session lifecycle](#cluster-session-lifecycle)

### SRV-20 · A failing command leaves the model mutated, flushes all undo history, and reports it as a message

> Filed as [#1805](https://github.com/eclipse-glsp/glsp/issues/1805), together with SRV-16, SRV-17.

- **Location:** `common/command/command-stack.ts:90-106,154-159` · `common/operations/operation-action-handler.ts:148-155`
- **What's wrong:** `execute()` catches the command error and `handleError` flushes the whole stack and rethrows, but the command has already half-mutated the model, because the recording command computes its undo patch only _after_ `doExecute` returns. The session is left with a partially applied change, no undo entry for it, and `isDirty` forced true via the `saveIndex = -2` sentinel.
- **Direction:** Have the stack roll the command back before flushing, which the patch machinery could do by capturing `beforeState` eagerly, or refuse to leave a mutated model without a matching undo entry.
- **Size:** M
- **Cluster:** [the model update pipeline](#cluster-the-model-update-pipeline)
- **Adjacent to:** [#1632](https://github.com/eclipse-glsp/glsp/issues/1632).

### SRV-21 · `ModelState` is an untyped string-keyed property bag fed straight from client options

> Filed as [#1806](https://github.com/eclipse-glsp/glsp/issues/1806).

- **Location:** `common/features/model/model-state.ts:25-37,52,62-72` · `common/features/model/request-model-action-handler.ts:352-354`
- **What's wrong:** What the server remembers between requests is a `Map<string, any>` addressed by ad-hoc string constants (`SOURCE_URI_ARG`, `ClientOptionsUtil.IS_RECONNECTING`), and `RequestModelActionHandler` copies _all_ client-supplied `action.options` into it with `setAll`. The one property with a typed accessor (`sourceUri`) reads through the same untyped `get`, and the optional `guard` parameter silently returns `undefined` on mismatch.
- **Direction:** A declared, typed session-state shape, with well-known keys as real properties and adopter extensions via a typed key mechanism, so what survives a request is visible in the type system.
- **Size:** M
- **Counterpart:** [PROT-3](protocol.md#prot-3--the-diagrams-identity-sourceuri-is-an-untyped-args-key-defined-outside-the-protocol-package), filed as [#1768](https://github.com/eclipse-glsp/glsp/issues/1768). That issue gives source-model identity a typed field; this one is the untyped bag it is stored in.
- **Adjacent to:** [#1748](https://github.com/eclipse-glsp/glsp/issues/1748). See [PROT-3](protocol.md) for `sourceUri` specifically, and [cross-cutting.md](cross-cutting.md#untyped-escape-hatches).

### SRV-22 · `GModelIndex` mixes id and type lookups, rescans for every edge query, and disagrees with itself on missing elements

> Filed as [#1802](https://github.com/eclipse-glsp/glsp/issues/1802), together with SRV-10, SRV-11, SRV-12.

- **Location:** `common/features/model/gmodel-index.ts:64,70-74,78-86,178-181,221-245,305-327,337-340` · callers passing ids to `findByClass` at `common/gmodel/change-bounds-operation-handler.ts:88` and `edit-task-operation-handler.ts:260`
- **What's wrong:** `findByClass(elementTypeId: string, …)` actually takes an element _id_. It calls `this.find(elementTypeId)`, an id lookup, and every caller passes an id. `find`'s condition `element && predicate ? predicate(element) : true` binds as `(element && predicate) ? … : true` and works only by accident. `get` throws while `find` returns `undefined`, and `findParentElement` calls the throwing `get` and then null-checks it. `getIncomingEdges`/`getOutgoingEdges` each rebuild the full edge list with `getAllByClass(GEdge)`, which `GModelDeleteOperationHandler.collectDependents` calls once per deleted element.
- **Direction:** One naming rule (id vs type), one missing-element policy, and a source/target adjacency map built in `indexRoot` alongside the id and type maps.
- **Size:** M
- **Cluster:** [the graph model](#cluster-the-graph-model)

### SRV-23 · Session-singleton handlers keep per-execution state on the instance

> Filed as [#1803](https://github.com/eclipse-glsp/glsp/issues/1803), together with SRV-13, SRV-15, SRV-18.

- **Location:** `common/gmodel/delete-operation-handler.ts:147,168-173` · `common/features/contextactions/tool-palette-item-provider.ts:64,68,86`
- **What's wrong:** Handlers are instantiated once per session and then mutate instance fields during execution. `GModelDeleteOperationHandler.allDependentsIds` is reset inside the command body, so it is live across undo/redo and across interleaved executions, and `DefaultToolPaletteItemProvider.counter` is reset but never incremented, so every palette item is emitted with the id `palette-item0`. The latter is a live defect.
- **Direction:** Pass the per-execution accumulator down the call chain instead of hanging it on the injected singleton.
- **Size:** S
- **Cluster:** [session lifecycle](#cluster-session-lifecycle)

---

## DI & module architecture

Server-only DI problems. Composition-model divergence from the client is
[X-1](cross-cutting.md#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision);
unstated scope defaults are [X-3](cross-cutting.md#x-3--scope-by-omission-services-that-read-as-singletons-are-transient).

### SRV-24 · `applyBindingTarget` fabricates a fake fluent binding syntax, so declared scope is a suggestion

> Filed as [#1800](https://github.com/eclipse-glsp/glsp/issues/1800), together with SRV-3, SRV-25, SRV-27.

- **Location:** `common/di/binding-target.ts:120-184` (`NoOPSyntax`) · consumed at `common/di/diagram-module.ts:139-198`
- **What's wrong:** `DiagramModule` writes `.inSingletonScope()` at ~15 call sites, but the returned object is a stub whose behaviour depends on what the subclass returned: for a `ConstantValueTarget` it `console.warn`s, for a `ServiceTarget` it silently returns itself, and `.when*()`/`.inTransientScope()` on a `toService` target throws a synthetic `NoOpInvocation` at container-load time. The declared return type `interfaces.BindingInWhenOnSyntax<T>` is not what is returned.
- **Direction:** Make the binding target carry its own scope (`{ service: X, scope: 'singleton' }`) and have `applyBindingTarget` return `void`, so scope is stated once, where the binding kind is known.
- **Size:** M
- **Cluster:** [DI and binding mechanics](#cluster-di-and-binding-mechanics)

### SRV-25 · Three mutually incompatible multi-binding mechanisms, because scope is not part of the abstraction

> Filed as [#1800](https://github.com/eclipse-glsp/glsp/issues/1800), together with SRV-3, SRV-24, SRV-27.

- **Location:** `common/di/multi-binding.ts:73` (`MultiBinding`, transient and a real multi-injection), `:85` (`InstanceMultiBinding`, which binds **one array** as a constant value) · `packages/server/server-mcp/src/common/modules/abstract-mcp-server-module.ts:93` (`McpHandlerMultiBinding`, singleton plus `toService`), with the explanatory comment at `:88-91`
- **What's wrong:** `InstanceMultiBinding` is not multi-injection at all. Consumers do `container.get<X[]>(Id)` (`diagram-module.ts:279`), so a second module contributing to the same identifier produces an ambiguous-match error rather than more contributions. All three classes are structurally identical, so TypeScript cannot tell them apart at the `configureMultiBinding` call sites, which is why `mcp-diagram-module.ts:109,113,117` need `as` casts.
- **Direction:** One multi-binding type with explicit scope and aggregation options, and a `configureMultiBinding` signature that preserves the concrete binding type.
- **Size:** M
- **Cluster:** [DI and binding mechanics](#cluster-di-and-binding-mechanics)
- **See also:** [SRV-2](#srv-2--action-and-operation-handlers-can-only-be-contributed-by-subclassing-diagrammodule) and [SRV-3](#srv-3--multibinding-has-no-scope-control-and-erases-its-own-type-so-the-one-adopter-reimplemented-it). The same mechanism from the extension-point side.

### SRV-26 · There is no diagram-type-level metadata, so three places materialize a fake session to read static information

> Filed as [#1807](https://github.com/eclipse-glsp/glsp/issues/1807).

- **Location:** `common/actions/global-action-provider.ts:41-51` · `packages/server/server-mcp/src/common/server/mcp-diagram-handler-dispatcher.ts:120-149` · `packages/server/server-mcp/src/common/tools/handlers/element-types-mcp-tool-handler.ts:135-153` · sentinel at `common/di/client-session-module.ts:33` (`TEMPORARY_CLIENT_ID = 'tempId'`), branched on at `mcp-diagram-tool-handler-registry.ts:77`
- **What's wrong:** Answering "which action kinds / element types / handlers does diagram type X support?" requires building a child container, loading every diagram module plus a placeholder session module, running every `ClientSessionInitializer`, reading one value, and calling `unbindAll()`. The probe is signalled by a magic client id that handlers branch on, and the third probe site uses the literal `'mcp-element-types-temp'` instead, so that branch silently does not apply there.
- **Direction:** Let a diagram module declare its static capabilities without instantiation, so probe containers and sentinel client ids disappear.
- **Size:** L
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741).

### SRV-27 · The container itself is a bound service whose meaning depends on who asks

> Filed as [#1800](https://github.com/eclipse-glsp/glsp/issues/1800), together with SRV-3, SRV-24, SRV-25.

- **Location:** `common/di/service-identifiers.ts:25` · bound at `node/di/app-module.ts:26` and `browser/di/app-module.ts:24`, **and again** at `common/di/server-module.ts:86-88` behind an `isBound` guard · injected at `client-session-factory.ts:45`, `global-action-provider.ts:37`, `glsp-server-launcher.ts:30`, `mcp-diagram-handler-dispatcher.ts:96`, `element-types-mcp-tool-handler.ts:72`
- **What's wrong:** `InjectionContainer` is `toDynamicValue(ctx => ctx.container)`, meaning "whatever container started this resolution". It is named `serverContainer` at every injection site but would be the _session_ container if the consumer were ever resolved from one, and the same concern is bound in two different modules behind a defensive `isBound` check to stop them colliding.
- **Direction:** Replace the generic container handle with narrow, purpose-named services (a `SessionContainerFactory`, a `DiagramModuleRegistry`), so no component holds the container.
- **Size:** M
- **Cluster:** [DI and binding mechanics](#cluster-di-and-binding-mechanics)

### SRV-28 · A per-session concern is bound in the app module, with scope substituting for a missing lifetime

> Filed as [#1808](https://github.com/eclipse-glsp/glsp/issues/1808).

- **Location:** `browser/di/app-module.ts:25-27` (comment: "Transient on purpose: a singleton at the server-container level would be shared across sessions and leak the browser flag between them") vs `node/di/app-module.ts:27` (`.inSingletonScope()`) · consumed at `common/actions/action-dispatcher.ts:170`
- **What's wrong:** `ActionDispatchScope` is per-session state bound two container levels up in the platform app module; because no session-scope binding site exists there, the browser variant uses transient scope to approximate "one per dispatcher", and node and browser end up with different sharing semantics for the same identifier.
- **Direction:** Bind session-lifetime services in the session container via a platform hook on `DiagramModule`, so scope expresses sharing rather than substituting for a missing lifetime.
- **Size:** S

---

## Layering & internal structure

### SRV-29 · Nothing checks the `common/` / `node/` / `browser/` split, and `common/` already imports `net`

> Filed as [#1809](https://github.com/eclipse-glsp/glsp/issues/1809).

- **Location:** `common/launch/jsonrpc-server-launcher.ts:27` (`import * as net from 'net'`) · exported by `common/index.ts:84` · reachable from `browser/reexport.ts:16` → `browser/index.ts:19`
- **What's wrong:** A Node-socket launcher lives in `common/` and is re-exported from the browser entry point. The web-worker bundle contains `JsonRpcGLSPServerLauncher` and avoids a broken build only because every `net.*` use sits in a type position. One value-level use (`net.isIP`, constructing a `net.Server`) would break `pnpm bundle:browser` with no earlier signal.
- **Direction:** Move the socket launcher to `node/` and keep only the transport-agnostic base in `common/`, or add a lint/bundle check that fails when a `common/` module reaches a Node builtin.
- **Size:** M
- **Watch out when enforcing:** a path-based rule that lets any `node/` module import Node builtins would whitelist browser code in `examples/workflow-standalone/src/node/`. Scope the rule to the server packages, or fix the example's directory names first. See [EX-1](examples.md#ex-1--two-sibling-examples-use-the-same-nodebrowser-vocabulary-for-opposite-distinctions).
- **See also:** [TOOL-1](tooling.md). There is no lint rule covering this split at all.

### SRV-30 · The server's DI symbol registry imports two feature modules

> Filed as [#1810](https://github.com/eclipse-glsp/glsp/issues/1810).

- **Location:** `common/di/service-identifiers.ts:16-17` → `common/features/directediting/context-edit-validator.ts:18` → `common/features/model/model-state.ts:19` → back to `service-identifiers.ts`
- **What's wrong:** The server's single import cycle exists only so a factory _type alias_ (`ValidateLabelEditAdapterFactory`, `:38`) can be co-located with the symbols, pulling the feature layer into the module 14 others treat as the bottom of the graph.
- **Direction:** Keep `service-identifiers.ts` symbol-only and declare the factory type next to the feature that implements it.
- **Size:** S

---

## Cluster: session lifecycle

A session is created with a protocol and destroyed without one. These four are the same missing contract seen from four places.

- [SRV-13](#srv-13--disposing-a-client-session-leaves-its-container-and-every-service-in-it-alive): disposing a session leaves its container and every service in it alive.
- [SRV-15](#srv-15--client-sessions-have-no-teardown-protocol): there is no teardown protocol at all; `ClientSessionInitializer` has no counterpart.
- [SRV-18](#srv-18--two-components-own-the-client-session-map): two components own the client-session map, so a session disposed through one stays live in the other.
- [SRV-23](#srv-23--session-singleton-handlers-keep-per-execution-state-on-the-instance): session-singleton handlers keep per-execution state on the instance.

---

## Cluster: DI and binding mechanics

How the server binds, scopes and contributes services. Four findings, one binding layer.

- [SRV-3](#srv-3--multibinding-has-no-scope-control-and-erases-its-own-type-so-the-one-adopter-reimplemented-it): `MultiBinding` has no scope control and erases its own type, so `server-mcp` reimplemented it.
- [SRV-24](#srv-24--applybindingtarget-fabricates-a-fake-fluent-binding-syntax-so-declared-scope-is-a-suggestion): `applyBindingTarget` fabricates a fake fluent syntax, so a declared scope is a suggestion.
- [SRV-25](#srv-25--three-mutually-incompatible-multi-binding-mechanisms-because-scope-is-not-part-of-the-abstraction): three structurally identical, mutually incompatible multi-binding mechanisms.
- [SRV-27](#srv-27--the-container-itself-is-a-bound-service-whose-meaning-depends-on-who-asks): the container is itself a bound service whose meaning depends on who resolves it.

---

## Cluster: handler contribution

Contributing a handler, and what the framework does with it once contributed.

- [SRV-2](#srv-2--action-and-operation-handlers-can-only-be-contributed-by-subclassing-diagrammodule): handlers can only be contributed by subclassing `DiagramModule`.
- [SRV-4](#srv-4--bindoperations-instantiates-every-operation-handler-with-new-outside-the-container): `bindOperations` instantiates every operation handler with `new`, outside the container.
- [SRV-5](#srv-5--createoperationhandleris-demands-instanceof-a-class-the-type-only-describes-structurally): `CreateOperationHandler.is` demands `instanceof` a class the type only describes structurally.
- [SRV-6](#srv-6--the-documented-actionhandlerpriority-ordering-never-takes-effect): the documented `ActionHandler.priority` ordering never takes effect.
- [SRV-7](#srv-7--gmodeloperationhandler-is-missing-its-decorator-because-injectable-is-a-bare-call): `GModelOperationHandler` is missing its decorator, because `injectable();` is a bare call.

---

## Cluster: the graph model

`packages/server/graph` and its index: builders, traits and lookups.

- [SRV-10](#srv-10--the-gmodel-builder-family-is-inconsistent-type-by-type-and-two-builders-silently-drop-0): the builder family is inconsistent type by type, and two builders silently drop `0`.
- [SRV-11](#srv-11--gshapeelement-declares-positionsize-as-always-present-while-the-trait-declares-them-optional): `GShapeElement` declares `position` and `size` as always present while the trait declares them optional.
- [SRV-12](#srv-12--gmodel-trait-builders-reach-into-a-protected-member-by-string-index): trait builders reach into a `protected` member by string index.
- [SRV-22](#srv-22--gmodelindex-mixes-id-and-type-lookups-rescans-for-every-edge-query-and-disagrees-with-itself-on-missing-elements): `GModelIndex` mixes id and type lookups, rescans for every edge query, and disagrees with itself.

---

## Cluster: the model update pipeline

What happens between an operation arriving and a model going back. The three interact: the handshake feeds the rebuild, and the rebuild is what a failing command leaves half-applied.

- [SRV-16](#srv-16--the-initial-model-handshake-is-a-latch-and-a-revision-mismatch-strands-it-permanently): the initial-model handshake is a latch, and a revision mismatch strands it permanently.
- [SRV-17](#srv-17--every-operation-serializes-deep-clones-diffs-and-rebuilds-the-entire-graph-model): every operation serializes, deep-clones, diffs and rebuilds the entire graph model.
- [SRV-20](#srv-20--a-failing-command-leaves-the-model-mutated-flushes-all-undo-history-and-reports-it-as-a-message): a failing command leaves the model mutated, flushes all undo history, and reports it as a message.

---

## Cluster: layout-elk

Both findings are in `packages/server/layout-elk` and both concern its extension points.

- [SRV-8](#srv-8--layout-elk-cannot-use-the-servers-own-di-and-its-injected-logger-is-never-populated): `layout-elk` cannot use the server's own DI, and its injected logger is never populated.
- [SRV-9](#srv-9--layout-elks-documented-override-points-for-labels-and-ports-are-dead-code): its documented override points for labels and ports are dead code, because the results are discarded.

---

## Withdrawn

**Nothing coordinates two sessions editing the same source model** (the previous `SRV-19`). It recorded that each
client session gets its own `ModelState`, `GModelIndex` and `CommandStack`, so two sessions on the same `sourceUri`
edit and save independently with last-write-wins, and proposed either stating a one-model-one-session rule or adding a
source-model-scoped layer. Withdrawn on maintainer review; not pursued for 3.0.

**`@eclipse-glsp/server` re-exports the entirety of protocol and graph** (the previous `SRV-1`). It recorded that
`common/reexport.ts:17-19` forwards both packages, so every protocol change is a server breaking change and every
symbol has two import paths, and proposed a curated re-export or none.

The re-export is deliberate. An adopter writing a server should need to know one package, `@eclipse-glsp/server`, and
not which of three packages a given symbol happens to live in. The "every protocol change is a server break" consequence
is not a cost either, because it is already true: GLSP packages are released in lockstep, and a
`@eclipse-glsp/server` 2.8.0 is not compatible with a `@eclipse-glsp/protocol` 2.7.1 whatever the barrel says. The
`McpServerOptions as McpServerOptionsType` alias in `server-mcp` is an internal naming clash, not evidence against the
design.

This is not the same argument as [CL-1](client.md), which stays open. Sprotty is a third-party package on its own
release cadence, so its re-export does let a release GLSP did not make change GLSP's API. Protocol and graph ship with
the server.

---

## Related findings in other components

- [PROT-16](protocol.md): the server reaches the shared DI API through `@eclipse-glsp/protocol/lib/di`.
- [PROT-18](protocol.md): the protocol package has no `common`/`node`/`browser` split, so `common/reexport.ts:18` re-exports a browser Web Worker provider into every Node consumer.
- [PROT-11](protocol.md): the wire-level half of `revision`, which is what strands the handshake in [SRV-16](#srv-16--the-initial-model-handshake-is-a-latch-and-a-revision-mismatch-strands-it-permanently). Operation acknowledgement, which [SRV-20](#srv-20--a-failing-command-leaves-the-model-mutated-flushes-all-undo-history-and-reports-it-as-a-message) depends on, is owned by [#1632](https://github.com/eclipse-glsp/glsp/issues/1632).
- [#1740](https://github.com/eclipse-glsp/glsp/issues/1740): no product package has an `exports` map, so subpaths are served by root stub files. Recorded as the withdrawn `TOOL-2` in [tooling.md](tooling.md#withdrawn).
- [X-1](cross-cutting.md) … [X-8](cross-cutting.md): DI composition, scope defaults, and the handler/`G*`/suffix/guard naming conventions.

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

### Public API and contracts

- `ArgsUtil.getNumber`/`getBoolean` test truthiness, so `0` and `false` are reported as absent; `getEdgeSourcePoint`/`getEdgeTargetPoint` therefore return `undefined` for any point on an axis (`common/utils/args-util.ts:69,78,89-97`).
- `GModelFactory.createModel(): void` is synchronous while `SourceModelStorage.loadSourceModel` is `MaybePromise<void>`: an adopter whose model derivation is async has no supported path (`common/features/model/gmodel-factory.ts:49` vs `source-model-storage.ts:40`).
- `ModelState.sourceUri` is a writable property on the interface but a getter-only accessor on the default implementation: assigning through the interface throws in strict mode (`common/features/model/model-state.ts:33` vs `:74-76`). Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `AbstractModelValidator.validate(elements, reason: string): Marker[]` is stricter and less async than the `ModelValidator.validate(elements, reason?): MaybePromise<Marker[]>` it implements (`common/features/validation/model-validator.ts:35` vs `:40`).
- `GLSPServer.shutdown` is documented as leaving the server disposed and unusable, but `DefaultGLSPServer.shutdown` clears `initializeResult`, making the server re-initializable (`packages/common/protocol/src/client-server-protocol/glsp-server.ts:83-90` vs `common/protocol/glsp-server.ts:238-247`).
- `ClientSessionManager.removeListener` returns `.every(removed => removed)` across every client bucket, so it returns `false` whenever the listener was not registered for _every_ client id: contradicting its own doc (`common/session/client-session-manager.ts:173-177,86-92`).
- `ContextActionsProviderRegistry` registers by `contextId` through `Registry.register`, which rejects duplicates with a `logger.warn`: two providers for one context silently lose one (`common/features/contextactions/context-actions-provider-registry.ts:36-45`, `common/utils/registry.ts:43-50`).
- Module method visibility is inconsistent: `ServerModule.configure` is public and reads `this.context`, `DiagramModule.configure` is protected and rebuilds `{bind, isBound}`, and `configureClientSessionInitializers` is public while every sibling `configureXxx` is protected (`common/di/server-module.ts:70-71`, `common/di/diagram-module.ts:134-136,201,206`).
- `GLSPModule.CLIENT_ACTIONS` and `ServerModule.DIAGRAM_MODULES` are exported string constants that nothing in the workspace references (`common/di/glsp-module.ts:37`, `common/di/server-module.ts:47`).
- Java-port leftovers in public TSDoc: `DiagramConfiguration.typeMapping` explains itself in terms of GSON and `EClass` (`common/diagram/diagram-configuration.ts:90-96`), `GModelIndex.typeCount` documents an `eClass` parameter that does not exist (`common/features/model/gmodel-index.ts:128-137`), `AbstractModelValidator` carries HTML `<p>`/`<code>` Javadoc (`common/features/validation/model-validator.ts:57-105`).
- `createAppModule` is exported under one name from two entry points with incompatible signatures: `LaunchOptions` (`node/di/app-module.ts:24`) vs `LoggerConfigOptions` (`browser/di/app-module.ts:21`).
- `JsonCreateNodeOperationHandler` (`common/operations/json-operation-handler.ts:100-150`) and `GModelCreateNodeOperationHandler` (`common/gmodel/gmodel-create-node-operation-handler.ts:65-115`) duplicate ~50 lines of extension points verbatim: a fix to one never reaches the other.
- `OperationHandler.handles` returns `this.modelState.root && operation.kind === this.operationType`, declared `boolean` but `undefined` before the first model load (`common/operations/operation-handler.ts:72-73`).
- `layout-elk`'s barrel re-exports `LayoutOptions` from `elkjs`, putting a third-party type into the package's public API (`packages/server/layout-elk/src/reexport.ts:16`, `index.ts:20`).
- `LayoutEngine.layout` returns the `GModelRoot`, but both in-tree callers ignore it and the ELK engine mutates in place: the contract's return channel is decorative (`common/features/layout/layout-engine.ts:29`, `common/features/model/model-submission-handler.ts:150`, `common/features/layout/layout-operation-handler.ts:60`).
- `CompoundCommand.execute` stops rolling back at the first non-undoable command, leaving a partially applied compound operation with no signal (`common/command/command.ts:82-91`). Adjacent to [#1632](https://github.com/eclipse-glsp/glsp/issues/1632).

### Runtime

- `common/gmodel/paste-operation-handler.ts:96-98`: `filterElements` discards the result of `elements.filter(...)`, so the `shouldExcludeElement` extension point has no effect. Live defect.
- `node/launch/websocket-server-launcher.ts:166-168`: `override start()` calls `super.start(options)` and drops the returned promise, so socket errors from `run()` surface as unhandled rejections.
- `common/session/client-session-manager.ts:147-157`: `disposeClientSession` drops the per-session listener bucket but leaves globally (`'*'`) registered listeners holding the disposed session.
- `common/operations/compound-operation-handler.ts:512`: all sub-handlers' `createCommand` are invoked eagerly before any sub-command executes, so each computes against the pre-compound model state.
- `common/features/model/gmodel-serializer.ts:92-94`: `getConfiguredConstructor` writes resolved subtype keys back into `diagramConfiguration.typeMapping`, mutating configuration state as a cache.
- `common/features/model/gmodel-serializer.ts:161-174`: `isReserved` treats any property with a getter as non-serializable, so computed model properties silently disappear from the schema.
- `common/features/model/gmodel-index.ts:204-208`: `doIndex` throws on duplicate ids from inside `updateRoot`, leaving `ModelState.root` swapped but the index cleared.
- `common/operations/operation-handler-registry.ts:203,211`: create handlers are keyed by the unescaped concatenation `` `${operationType}_${elementTypeId}` ``, and `registerHandler` returns `true` for them regardless of whether `register` succeeded.
- `common/features/progress/progress-service.ts:350-353`, `request-model-action-handler.ts:387,392`, `model-submission-handler.ts:285`: `actionDispatcher.dispatch(...)` is called without awaiting or catching, so a dispatch rejection becomes an unhandled rejection.
- `common/features/validation/model-validator.ts:212,217`: live validation is debounced on `ModelSubmissionHandler` (`model-submission-handler.ts:278-282`) by a timer nothing cancels on session disposal.
- `common/features/navigation/navigation-target-resolver.ts:142-144`: `INFO`/`WARNING`/`ERROR` are instance fields used as untyped `Args` keys on the resolver base class.

### DI, modules and structure

- Module instances carry mutable binding state: `GLSPModule.context` is assigned inside the `super()` callback (`common/di/glsp-module.ts:41-46`) and read later by `configureMultiBinding` (`:66`) and `ServerModule.configure` (`server-module.ts:71`); `AbstractMcpDiagramModule` repeats this with `this.bind`/`this.rebind` fields (`mcp-diagram-module.ts:92-102`). The same module instance is loaded into probe containers _and_ session containers, so those fields point at whichever container loaded last.
- `GLSPModule` is decorated `@injectable()` (`common/di/glsp-module.ts:35`), as is every subclass (`gmodel-diagram-module.ts:51`, `layout-elk/src/di.config.ts:79`, `examples/workflow-server/src/common/workflow-diagram-module.ts:63,70`), although container modules are never resolved from a container.
- `ElkLayoutModule.bindLoggerFallbacks` (`packages/server/layout-elk/src/di.config.ts:152-163`) conditionally binds `Logger`/`LoggerFactory` owned by another layer, while `configureWinstonLogger` (`node/di/app-module.ts:79-86`) unbinds them: `Logger` is bound or unbound in four production code paths with three different strategies. Adjacent to [#1583](https://github.com/eclipse-glsp/glsp/issues/1583).
- `Logger` is bound `toDynamicValue` deriving its `caller` from the inversify request tree (`node/di/app-module.ts:101`, `console-logger.ts:92`, `common/utils/logger.ts:76`), which makes it silently useless whenever obtained via `container.get(Logger)` (`abstract-mcp-server-module.ts:243`, `app-module.ts:88`). Adjacent to [#1583](https://github.com/eclipse-glsp/glsp/issues/1583).
- `ValidateLabelEditAdapterFactory` (`common/di/service-identifiers.ts:33`) is declared as both a symbol and a type and is never bound or injected.
- `ContextActionsProvider` and `ContextActionsProviders` coexist as a singular/plural symbol pair where only the plural is a real identifier: a third instance of the shape [SRV-14](#srv-14--two-extension-points-have-no-in-repo-consumer-and-no-test-that-exercises-them-through-di) records for `NavigationTargetProvider` and `ContextEditValidator`.
- `common/gmodel/gmodel-create-edge-operation-handler.ts:18` imports `GNode` from `@eclipse-glsp/graph/lib/gnode` while line 17 imports its siblings from the barrel: a deep import into another workspace package's build output, for a symbol the barrel exports.
- `browser/di/app-module.ts:18` imports `'../../common/'` with a trailing slash where `node/di/app-module.ts:19` uses `'../../common'`; the trailing form is not resolvable under ESM with `exports`. Adjacent to [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).
- A stale cross-repo path in a comment still describing the pre-consolidation layout: `packages/server/graph/src/default-types.ts:31` refers to `packages/server-node/src/features/model/gmodel-serializer.ts`.
- `common/di/diagram-module.ts` has a fan-out of 51: the single largest coupling point on the server. Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
