# A7 — Server runtime model · naming & concept consistency

A second-class lens: recorded, not dwelt on.

Surfaces swept: (A) `packages/server/server/src`, `packages/server/graph/src` and `examples/workflow-server/src` as the
reference implementation; (B) naming and concept consistency across `packages/**/src`.

Every finding below was verified against the source.

See [index.md](index.md) for scope and the coverage register.

---

## (A) Server runtime model

### A7-1 · Client sessions have no teardown protocol

- **Location:** `common/session/client-session.ts:48-61` · `common/session/client-session-factory.ts:62-67` · `common/session/client-session-manager.ts:147-157` · the opposite convention one level up at `common/launch/jsonrpc-server-launcher.ts:142-147`
- **What's wrong:** `DefaultClientSession.dispose()` runtime-checks `Disposable.is(this.actionDispatcher)` and disposes that one object; the session's inversify child container is never unloaded and no other session-scoped service — model state, index, command stack, storage, validators, progress monitors, adopter services — is ever told the session ended. There is a `ClientSessionInitializer` for setup with no counterpart for teardown, the server uses zero `@preDestroy` anywhere, and `DefaultClientSession` is `new`'d directly so adopters cannot substitute it. Meanwhile the _connection_-level container **is** `unbindAll()`'d by the launcher.
- **Direction:** A session-scoped disposal contract — a `ClientSessionDisposer` multi-binding, or a `DisposableCollection` owned by the session container that `disposeClientSession` drains — plus resolving the session object through DI.
- **Size:** M
- **See also:** [api-server.md](api-server.md) A2-14, which records the same gap from the API side.

### A7-2 · The initial-model handshake is a latch, and a revision mismatch strands it permanently

- **Location:** `common/features/model/model-submission-handler.ts:182,201-209,224,293-298` · `common/features/layout/computed-bounds-action-handler.ts:50-61`
- **What's wrong:** The four-step `RequestModel → RequestBounds → ComputedBounds → SetModel` exchange is carried by a mutable `requestModelAction?` field, and while it is set every `submitModel()` forces `revision = 0`. If `ComputedBoundsActionHandler` sees `action.revision !== model.revision` it returns `[]`, so the latch is never cleared — the client's `RequestModelAction` never resolves, and the _next_ operation emits a `SetModelAction` carrying the stale `responseId` and revision 0.
- **Direction:** Make the load round trip an explicit request/response the dispatcher already supports, so the pending state lives in a promise rather than a field, and make a revision mismatch a decision rather than a silent drop.
- **Size:** M
- **See also:** [protocol.md](protocol.md) A4-1 and A4-11 — the wire-level half of the same handshake.

### A7-3 · Every operation serializes, deep-clones, diffs and rebuilds the entire graph model

- **Location:** `common/command/recording-command.ts:318-325,392-399` · `common/features/model/model-state.ts:94-100`
- **What's wrong:** `AbstractRecordingCommand.execute` snapshots the whole `GModelRoot` as JSON, runs the change, snapshots again and stores two full json-patches; then `GModelRecordingCommand.postChange` calls `serializer.createRoot(newModel)` plus `updateRoot`. After _any_ operation every `GModelElement` instance is a different object, every cached element reference held by a handler is detached, and each undo entry retains a patch proportional to the model.
- **Direction:** Record patches against the source model only — as `JsonRecordingCommand` already does — and let commands mutate the GModel in place; or make the rebuild explicit in the `Command` contract so handlers know references do not survive.
- **Size:** L
- **Adjacent to:** [#1251](https://github.com/eclipse-glsp/glsp/issues/1251) — that issue is about the wire; this is the server-side rebuild and the identity loss it causes.

### A7-4 · Two components own the client-session map

- **Location:** `common/protocol/glsp-server.ts:64,143-147,153-161,238-243` vs `common/session/client-session-manager.ts:109,118-133,147-157` · the listener at `client-session-manager.ts:187`
- **What's wrong:** `DefaultGLSPServer` keeps its own `clientSessions` map in addition to `DefaultClientSessionManager`'s, and `process()` resolves from the server's copy — so a session disposed through the manager directly stays live and reachable in the server's map, and `shutdown()` clears the copy with no ordering guarantee against the listener that actually disposes sessions.
- **Direction:** One owner — the server delegates every lookup to `ClientSessionManager` and keeps no map.
- **Size:** S

### A7-5 · Nothing coordinates two sessions editing the same source model

- **Location:** `common/di/diagram-module.ts:144-146` (`ModelState`/`GModelIndex` as per-session singletons) · `common/features/model/request-model-action-handler.ts:375-384` · `common/features/model/save-model-action-handler.ts:139-143`
- **What's wrong:** Each client session gets its own `ModelState`, `GModelIndex` and `CommandStack` keyed by nothing but the session id, so two sessions opened on the same `sourceUri` load, edit and save independently with last-write-wins and no notification. The only trace of conflict awareness is a reconnect hack that decrements `root.revision` by one to suppress a "source model was changed" warning that no code in this repo raises.
- **Direction:** Either state explicitly that one source model maps to exactly one session, or introduce a source-model-scoped layer between server and session that sessions attach to.
- **Size:** L

### A7-6 · A failing command leaves the model mutated, flushes all undo history, and reports it as a message

- **Location:** `common/command/command-stack.ts:90-106,154-159` · `common/operations/operation-action-handler.ts:148-155`
- **What's wrong:** `execute()` catches the command error and `handleError` flushes the whole stack and rethrows — but the command has already half-mutated the model, because the recording command computes its undo patch only _after_ `doExecute` returns. The session is left with a partially applied change, no undo entry for it, and `isDirty` forced true via the `saveIndex = -2` sentinel.
- **Direction:** Have the stack roll the command back before flushing — the patch machinery could capture `beforeState` eagerly — or refuse to leave a mutated model without a matching undo entry.
- **Size:** M
- **Adjacent to:** [#1632](https://github.com/eclipse-glsp/glsp/issues/1632).

### A7-7 · `ModelState` is an untyped string-keyed property bag fed straight from client options

- **Location:** `common/features/model/model-state.ts:25-37,52,62-72` · `common/features/model/request-model-action-handler.ts:352-354`
- **What's wrong:** What the server remembers between requests is a `Map<string, any>` addressed by ad-hoc string constants (`SOURCE_URI_ARG`, `ClientOptionsUtil.IS_RECONNECTING`), and `RequestModelActionHandler` copies _all_ client-supplied `action.options` into it with `setAll`. The one property with a typed accessor (`sourceUri`) reads through the same untyped `get`, and the optional `guard` parameter silently returns `undefined` on mismatch.
- **Direction:** A declared, typed session-state shape — well-known keys as real properties, adopter extensions via a typed key mechanism — so what survives a request is visible in the type system.
- **Size:** M
- **Adjacent to:** [#1748](https://github.com/eclipse-glsp/glsp/issues/1748). See also [protocol.md](protocol.md) A4-3 for `sourceUri` specifically.

### A7-8 · `GModelIndex` mixes id and type lookups, rescans for every edge query, and disagrees with itself on missing elements

- **Location:** `common/features/model/gmodel-index.ts:64,70-74,78-86,178-181,221-245,305-327,337-340` · callers passing ids to `findByClass` at `common/gmodel/change-bounds-operation-handler.ts:88` and `edit-task-operation-handler.ts:260`
- **What's wrong:** `findByClass(elementTypeId: string, …)` actually takes an element _id_ — it calls `this.find(elementTypeId)`, an id lookup, and every caller passes an id. `find`'s condition `element && predicate ? predicate(element) : true` binds as `(element && predicate) ? … : true` and works only by accident. `get` throws while `find` returns `undefined`, and `findParentElement` calls the throwing `get` and then null-checks it. `getIncomingEdges`/`getOutgoingEdges` each rebuild the full edge list with `getAllByClass(GEdge)`, which `GModelDeleteOperationHandler.collectDependents` calls once per deleted element.
- **Direction:** One naming rule (id vs type), one missing-element policy, and a source/target adjacency map built in `indexRoot` alongside the id and type maps.
- **Size:** M

### A7-9 · Session-singleton handlers keep per-execution state on the instance

- **Location:** `common/gmodel/delete-operation-handler.ts:147,168-173` · `common/features/contextactions/tool-palette-item-provider.ts:64,68,86`
- **What's wrong:** Handlers are instantiated once per session and then mutate instance fields during execution — `GModelDeleteOperationHandler.allDependentsIds` is reset inside the command body, so it is live across undo/redo and across interleaved executions, and `DefaultToolPaletteItemProvider.counter` is reset but never incremented, so every palette item is emitted with the id `palette-item0`. The latter is a live defect.
- **Direction:** Pass the per-execution accumulator down the call chain instead of hanging it on the injected singleton.
- **Size:** S

---

## (B) Naming & concept consistency

### A7-10 · `ActionHandler`, `ActionHandlerRegistry` and the `G*` model classes each name two or three unrelated things

- **Location:** `packages/server/server/src/common/actions/action-handler.ts:19-54` vs `packages/client/glsp-sprotty/src/action-handler-override.ts:31-44,47` · `packages/server/server/src/common/actions/action-handler-registry.ts:88` vs `packages/client/client/src/base/action-handler-registry.ts:21` · `packages/server/graph/src/ggraph.ts`, `gedge.ts`, `gnode.ts` vs `packages/client/client/src/model.ts:30,38` and `packages/client/glsp-sprotty/src/re-exports.ts:253`
- **What's wrong:** Server `ActionHandler` is `{ actionKinds, execute(): Action[], priority }`, client `IActionHandler` is `{ handle(): ICommand | Action | void }` with the kind supplied at registration, and `ActionHandler` in glsp-sprotty is an intersection type — three contracts, one word. Likewise `GGraph`/`GEdge`/`GNode` denote structurally unrelated classes on the two sides, the client's being Sprotty aliases, so a reader of `@eclipse-glsp/graph` and of `@eclipse-glsp/client` cannot tell that `GEdge` is not `GEdge`.
- **Direction:** Per-layer qualifiers for the handler triple, and an explicit decision on whether the client and server graph models are one vocabulary with two representations — then say so in architecture documentation — or two vocabularies, then distinguish the names.
- **Size:** L
- **Adjacent to:** [#1747](https://github.com/eclipse-glsp/glsp/issues/1747) — this is the _non_-deprecated residue of the `S`→`G` rename.

### A7-11 · The `Service` / `Manager` / `Provider` / `Registry` / `Factory` / `Handler` suffixes carry no rule

- **Location:** counts across `packages/*/*/src`: 113 `*Handler`, 42 `*Provider`, 21 `*Registry`, 18 `*Manager`, 12 `*Service`, 6 `*Factory` · concrete clusters: `packages/server/server/src/common/features/model/gmodel-factory.ts:43` (`createModel(): void`, mutates state) vs `common/session/client-session-factory.ts:32` (returns an instance) vs `common/actions/action-handler.ts:60-62` (`ActionHandlerFactory` is a `(ctor) => instance` DI function type) · `common/features/progress/progress-service.ts:308` vs `packages/client/client/src/base/selection-service.ts:66` vs `base/tool-manager/tool-manager.ts:86` with no distinguishing property · `packages/client/client/src/features/copy-paste/copy-paste-handler.ts:59` declares `LocalClipboardService` inside a `*-handler.ts` file
- **What's wrong:** Three words for "produces an instance", two for "coordinates stateful behaviour", and no property that tells them apart — the suffix carries no information an adopter can rely on.
- **Direction:** Write down the four or five roles the codebase actually has (lookup table, instance producer, stateful coordinator, request processor, extension point), map each to exactly one suffix, and rename at the major boundary.
- **Size:** L

### A7-12 · Client and server use incompatible conventions for "interface plus default implementation"

- **Location:** server: `common/features/model/model-state.ts:23-42` (`Symbol` + `interface` + `DefaultModelState`), `common/command/command-stack.ts:21-74`, but also `common/features/model/gmodel-factory.ts:410` (`GModelFactoryNullImpl`), `common/features/model/gmodel-index.ts:185` and `common/actions/client-action-handler.ts:148` (bare concrete class as its own DI key), `common/operations/operation-handler.ts:31` (abstract class, not interface + symbol) · client: `base/tool-manager/tool-manager.ts:86` (`IToolManager`/`ToolManager`), `features/grid/grid-manager.ts:42`, `base/shortcuts/shortcuts-manager.ts:38`
- **What's wrong:** Four coexisting patterns for one idea — `Symbol`+`Default*`, `I*`+concrete, bare class, abstract class — so an adopter cannot predict what to `@inject` or what to override from the name alone.
- **Direction:** One pattern per side at minimum, ideally one across the workspace, documented next to the DI rules.
- **Size:** M
- **Adjacent to:** [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).

### A7-13 · Three coexisting conventions each for construction and for type guards

- **Location:** construction: `Action.create(...)` namespace factories throughout `packages/common/protocol/src/action-protocol/*`, `GModelElement.builder()` fluent builders at `packages/server/graph/src/gmodel-element.ts:87-115`, plain `new` for commands at `packages/server/server/src/common/command/recording-command.ts:383`, and `commandOf(...)` at `common/gmodel/gmodel-operation-handler.ts:28` · guards: namespace `X.is(object)` (`common/protocol/client-action.ts:27` and every action protocol type), free `isFoo(...)` functions (`packages/common/protocol/src/model/model-schema.ts:42`, `packages/client/client/src/utils/gmodel-util.ts:275-326`, `packages/server/graph/src/gbounds-aware.ts`), and class-namespace guards now deprecated as redundant (`packages/server/graph/src/gedge.ts:293-297`)
- **What's wrong:** Whether a concept is created via `create`, a builder, or `new`, and whether its guard is `Foo.is(x)` or `isFoo(x)`, is decided per file rather than per kind of thing — and `GModelElementBuilder.build()` shallow-copies the proxy (`gmodel-element.ts:104-107`), so the builder convention does not hold its own invariant.
- **Direction:** Free `isX` guards for structural/schema types, `X.is` for protocol types; builders for graph elements, `create` for protocol payloads — and no third option.
- **Size:** M

### A7-14 · File and directory naming diverges per package

- **Location:** `packages/server/server/src/common/features/directediting/` and `.../features/contextactions/` vs `packages/client/client/src/features/context-menu/` and `.../features/helper-lines/`, and `examples/workflow-server/src/common/labeledit/`, `.../taskedit/` · `common/utils/layout-util.ts` vs `packages/client/client/src/utils/layout-utils.ts` · `packages/server/server-mcp/src/common/util/` and `examples/workflow-server/src/common/util/` vs `.../utils/` · `packages/server/graph/src/gpre-rendered-element.ts` vs `gshaped-prerendered-element.ts` · `packages/client/client/src/base/shortcuts/shortcuts-manager.ts:38` exports `ShortcutManager` · server handler files split between `*-action-handler.ts` (`request-model-action-handler.ts`) and `*-handler.ts` (`request-markers-handler.ts`, `request-edit-validation-handler.ts`) for identical `ActionHandler` implementations
- **What's wrong:** Compound words are run together in some packages and kebab-cased in others, `util` and `utils` both exist, and one file stem does not match its primary export.
- **Direction:** One rule — kebab-case multiword segments everywhere, `utils` plural, file stem matching its primary export — enforceable with a lint rule rather than review.
- **Size:** S

---

## Recorded elsewhere

- **The `ActionHandler.priority` comparator never compares the two handlers** — [api-server.md](api-server.md) A2-7.
- **`GModelOperationHandler`'s `injectable();` is missing its `@`** — [api-server.md](api-server.md) A2-8.
- **`bindOperations` instantiates handlers with `new` outside DI** — [api-server.md](api-server.md) A2-5.
- **`ClientSessionManager.removeListener` returns `false` for a partially registered listener** — [api-server.md](api-server.md) appendix.

---

## Appendix — remaining observations

- `common/gmodel/paste-operation-handler.ts:96-98` — `filterElements` discards the result of `elements.filter(...)`, so the `shouldExcludeElement` extension point has no effect. Live defect.
- `packages/server/server/src/node/launch/websocket-server-launcher.ts:166-168` — `override start()` calls `super.start(options)` and drops the returned promise, so socket errors from `run()` surface as unhandled rejections.
- `common/session/client-session-manager.ts:147-157` — `disposeClientSession` drops the per-session listener bucket but leaves globally (`'*'`) registered listeners holding the disposed session.
- `common/operations/compound-operation-handler.ts:512` — all sub-handlers' `createCommand` are invoked eagerly before any sub-command executes, so each computes against the pre-compound model state.
- `common/actions/global-action-provider.ts:217-240` — server startup builds a throwaway child container per diagram type, runs every `ClientSessionInitializer` under a fake `TEMPORARY_CLIENT_ID`, and releases it with `unbindAll()` rather than disposal. See [di.md](di.md) A3-6.
- `common/di/diagram-module.ts:147` — `GModelFactory` is the one model binding left transient while `ModelState`, `GModelIndex`, `GModelSerializer` and `SourceModelStorage` are singletons. See [di.md](di.md) A3-11.
- `common/features/model/gmodel-serializer.ts:92-94` — `getConfiguredConstructor` writes resolved subtype keys back into `diagramConfiguration.typeMapping`, mutating configuration state as a cache.
- `common/features/model/gmodel-serializer.ts:161-174` — `isReserved` treats any property with a getter as non-serializable, so computed model properties silently disappear from the schema.
- `common/features/model/gmodel-index.ts:204-208` — `doIndex` throws on duplicate ids from inside `updateRoot`, leaving `ModelState.root` swapped but the index cleared.
- `common/operations/operation-handler-registry.ts:203,211` — create handlers are keyed by the unescaped concatenation `` `${operationType}_${elementTypeId}` ``, and `registerHandler` returns `true` for them regardless of whether `register` succeeded.
- `common/features/progress/progress-service.ts:350-353`, `request-model-action-handler.ts:387,392`, `model-submission-handler.ts:285` — `actionDispatcher.dispatch(...)` is called without awaiting or catching, so a dispatch rejection becomes an unhandled rejection.
- `common/protocol/client-action.ts:35-37` — `ClientAction.mark` writes `__receivedFromClient` onto the incoming action object, which then travels with any action derived from or re-dispatching it. See [protocol.md](protocol.md) A4-4.
- `common/features/validation/model-validator.ts:212,217` — live validation is debounced on `ModelSubmissionHandler` (`model-submission-handler.ts:278-282`) by a timer nothing cancels on session disposal.
- `packages/server/graph/src/gmodel-element.ts:99-107` — `reset()` does not restore `id`/`cssClasses`, so a reset builder throws in `build()`; `build()` uses `Object.assign`, so arrays stay shared with the proxy. See [api-server.md](api-server.md) A2-11.
- `common/features/navigation/navigation-target-resolver.ts:142-144` — `INFO`/`WARNING`/`ERROR` are instance fields used as untyped `Args` keys on the resolver base class.
