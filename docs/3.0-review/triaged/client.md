# Client: `packages/client/*`

Surface swept: `packages/client/client/src` (270 files, ~27.5k LOC) and `packages/client/glsp-sprotty/src` (8 files),
plus every DI construct and import edge that originates in those two packages.

**27 findings** (`CL-3`, `CL-4`, `CL-6`, `CL-8`, `CL-19`, `CL-20`, `CL-22`, `CL-23` and `CL-34` resolved [below](#withdrawn-and-folded), hence the gaps). Unless a location starts with `packages/`, paths are relative to `packages/client/client/src/`.

One thing this sweep checked and found healthy: there are no name collisions across the 738 exported top-level
symbols in the client barrel, and `features/test/**` is excluded from both the barrel and `package.json#files`. The
barrel generator is doing its job. Where the public API is a problem below, it is what the package deliberately exports,
not what leaked.

Findings that the client shares with another component are **not** here. They are in
[cross-cutting.md](cross-cutting.md). Findings in code the client only _consumes_ (the protocol package's DI toolkit,
the wire contract) are in [protocol.md](protocol.md); see [Related findings](#related-findings-in-other-components)
at the end.

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

**Triage is complete.** Every finding is filed under [#1815](https://github.com/eclipse-glsp/glsp/issues/1815), itself a sub-issue of [#1744](https://github.com/eclipse-glsp/glsp/issues/1744), in 14 issues. Findings in the same cluster share one issue; each finding's `Filed as` line names it. The candidate issues in the appendix are **not** triaged and are still worth a pass.

---

## Public API and extension points

### CL-1 · `@eclipse-glsp/client` re-exports the whole of Sprotty as its own public API

> Filed as [#1785](https://github.com/eclipse-glsp/glsp/issues/1785), together with CL-9, CL-35.

- **Location:** `packages/client/client/src/re-exports.ts:16` (`export * from '@eclipse-glsp/sprotty'`) fanning out to `packages/client/glsp-sprotty/src/re-exports.ts:20-312`, which is `export * from '@eclipse-glsp/protocol'` plus ~120 deep `sprotty/lib/...` paths, including `sprotty/lib/utils/inversify`, `sprotty/lib/lib/jsx` and `sprotty/lib/base/views/viewer-cache`
- **What's wrong:** Everything Sprotty exports is `@eclipse-glsp/client` public API, so a Sprotty patch release can change GLSP's public API, and nothing distinguishes a GLSP contract from a transitively leaked Sprotty internal. There is not one `@internal` marker in either package.
- **Direction:** A curated, explicitly listed façade, or a separate `@eclipse-glsp/client/sprotty` entry point, so the seam is visible and Sprotty's surface stops being GLSP's compatibility promise.
- **Size:** L
- **Cluster:** [the Sprotty seam](#cluster-the-sprotty-seam)
- **See also:** [cross-cutting.md](cross-cutting.md#re-exports). One of four packages with this shape.

### CL-2 · `TYPES.IContextMenuProvider` is a shadow symbol that silently disables the marker-navigator menu

> Filed as [#1786](https://github.com/eclipse-glsp/glsp/issues/1786).

- **Location:** `packages/client/glsp-sprotty/src/types.ts:45` (`IContextMenuProvider: Symbol('IContextMenuProvider')`) vs Sprotty's `TYPES.IContextMenuItemProvider` = `Symbol.for('IContextMenuProvider')`, the same description with a different symbol · bound at `features/validation/validation-modules.ts:55` · every other provider uses the correct one (`features/context-menu/context-menu-module.ts:33`, `examples/workflow-glsp/src/workflow-diagram-module.ts:66`)
- **What's wrong:** Two service identifiers with identical descriptions coexist in the same exported `TYPES` object, and `MarkerNavigatorContextMenuItemProvider` is bound to the one no registry consumes, so the "go to next/previous marker" entries never appear. This is a live defect.
- **Direction:** Delete the shadow symbol, whose single usage is the bug, and let `TYPES` spread Sprotty's identifiers without redefining any.
- **Size:** S

### CL-5 · Type hints are applied by monkey-patching methods onto live model instances

> Filed as [#1787](https://github.com/eclipse-glsp/glsp/issues/1787), together with CL-26.

- **Location:** `features/hints/type-hint-provider.ts:123` (`element.isContainableElement = input => …`) and `:126-130` (`element.canConnect = …`, capturing the adopter's own implementation as `fallbackCanConnect` and using it only when no edge hint matches)
- **What's wrong:** An adopter who implements `Containable.isContainableElement` or `Connectable.canConnect` on their own model class has it silently replaced on every model update, and neither interface says so.
- **Direction:** Keep hint lookup in the provider and have `Containable`/`Connectable` implementations consult `ITypeHintProvider` explicitly, so overriding stays an ordinary method override.
- **Size:** M
- **Cluster:** [type hints](#cluster-type-hints)
- **See also:** [CL-26](#cl-26--type-hints-are-applied-by-mutating-shared-feature-sets-and-monkey-patching-model-methods-on-every-update). The runtime half of the same mechanism.

### CL-7 · `IChangeBoundsManager` is a 14-member interface whose type signatures erase themselves

> Filed as [#1788](https://github.com/eclipse-glsp/glsp/issues/1788).

- **Location:** `features/tools/change-bounds/change-bounds-manager.ts:58-178` · `usePositionSnap(arg: MouseEvent | KeyboardEvent | any)` at `:70`, `useMovementRestriction` at `:115`, `useSymmetricResize` at `:171` · implementations branch on `typeof arg === 'boolean'` at `:199`/`:323` · `createTracker()` at `:326-328` does `new ChangeBoundsTracker(this)`
- **What's wrong:** The one documented seam for move/resize policy takes parameters typed `any`, because the `| any` collapses each union, and its real contract (`boolean | MouseEvent | KeyboardEvent`) is discoverable only by reading the body, and the tracker it produces is `new`-ed rather than resolved, so customizing it requires subclassing the manager.
- **Direction:** Declare the actual union, and resolve the tracker through a bound factory.
- **Size:** M

### CL-9 · `AutocompleteSuggestionRegistry` can only be implemented by extending a Sprotty class

> Filed as [#1785](https://github.com/eclipse-glsp/glsp/issues/1785), together with CL-1, CL-35.

- **Location:** `base/auto-complete/autocomplete-suggestion-provider.ts:64-66`, where `export interface AutocompleteSuggestionRegistry extends InstanceRegistry<IAutocompleteSuggestionProvider>`, and `InstanceRegistry` declares `protected elements` / `protected missing`
- **What's wrong:** A `TYPES.IAutocompleteSuggestionProviderRegistry` binding that looks interface-based is in fact locked to one concrete Sprotty base class, and it inherits a `get()` that throws on a missing key.
- **Direction:** Declare the registry interface from its own members and let `DefaultAutocompleteSuggestionRegistry` keep `InstanceRegistry` as a private implementation detail.
- **Size:** S
- **Cluster:** [the Sprotty seam](#cluster-the-sprotty-seam)

### CL-10 · Empty marker interfaces make their type guards no-ops and let anything be a feedback key

> Filed as [#1789](https://github.com/eclipse-glsp/glsp/issues/1789), together with CL-27.

- **Location:** `base/feedback/feedback-action-dispatcher.ts:35` (`export interface IFeedbackEmitter {}`) · `features/hints/model.ts:41-45` (`Reparentable {}` plus `isReparentable(): element is GModelElement & Reparentable`) · `features/reconnect/model.ts:31-35` (`Reconnectable {}`)
- **What's wrong:** `GModelElement & Reparentable` is structurally identical to `GModelElement`, so these guards narrow nothing; and `registerFeedback(feedbackEmitter: IFeedbackEmitter, …)` accepts any object at all, which is why the implementation needs a runtime `instanceof GModelElement` warning at `:109-115` to catch the mistake the type was meant to prevent.
- **Direction:** Give `IFeedbackEmitter` a real discriminant (a branded `readonly feedbackId: string`) and replace the empty feature interfaces with branded types.
- **Size:** S
- **Cluster:** [feedback](#cluster-feedback)
- **Adjacent to:** [#1750](https://github.com/eclipse-glsp/glsp/issues/1750). That issue reshapes the feedback lifecycle; this is the type that identifies a feedback owner.

### CL-11 · Five contribution points, five different override policies, none stated in the API

> Filed as [#1790](https://github.com/eclipse-glsp/glsp/issues/1790), together with CL-32, CL-33.

- **Location:** `features/export/diagram-export-postprocessor.ts:63-71` (`@multiInject`, first-bound-wins, policy documented only in a comment inside a protected method at `:64-67`) · `base/model/model-registry.ts:29-42` (last-wins, `console.log`, plus a deprecation `console.warn`) · `base/view/view-registry.ts:26-35` (last-wins, `console.log`) · `packages/client/glsp-sprotty/src/layout-override.ts:44-53` (first-wins, `logger.warn`) · `packages/client/glsp-sprotty/src/action-handler-override.ts:47-66` (all-wins, `MultiInstanceRegistry`)
- **What's wrong:** An adopter registering a second contribution for the same key gets silently-ignored, silently-replaced, loudly-replaced or additive behaviour depending on which registry they hit, and the only way to find out is to read each `register`.
- **Direction:** One `override`/`replace` convention across the contribution points, expressed in the registration API rather than in logging.
- **Size:** M
- **Cluster:** [DI and service identifiers](#cluster-di-and-service-identifiers)
- **See also:** [cross-cutting.md](cross-cutting.md#contribution-points). The server has the mirror-image problem.

### CL-12 · The four GLSP edge routers are copy-paste, so an adopter's fifth router silently lacks the fixes

> Filed as [#1791](https://github.com/eclipse-glsp/glsp/issues/1791).

- **Location:** `features/routing/edge-router.ts:31-48`, `:53-70`, `:75-92`, `:97-114`, where `getTranslatedAnchor` and `cleanupRoutingPoints` are byte-identical across `GLSPAbstractEdgeRouter`, `GLSPPolylineEdgeRouter`, `GLSPManhattanEdgeRouter` and `GLSPBezierEdgeRouter`, comments included
- **What's wrong:** The two safety behaviours GLSP adds on top of Sprotty's routers, invalid-anchor fallback and a bounds guard before cleanup, exist only as duplicated method bodies, so extending `AbstractEdgeRouter` or any Sprotty router directly gets you neither, and nothing in the API says they exist.
- **Direction:** Extract them into an exported mixin or helper pair that a custom router calls, documented as the contract for a GLSP router.
- **Size:** S

### CL-13 · `messages` is a process-global mutable object typed to accept anything

> Filed as [#1792](https://github.com/eclipse-glsp/glsp/issues/1792).

- **Location:** `base/messages.ts:20` (`WithDynamicProperties<T> = T & Record<string, any>`), `:47-51`, `:56` (`export const messages: Messages = rawMessages`), `:68-71` (`updateMessages` mutates in place and fires a global emitter)
- **What's wrong:** The doc at `:45` promises "type-safe access to the known messages" while the type intersects `Record<string, any>`, so `messages.typo.that.does.not.exist` compiles and yields `any`; and because it is a module singleton, two diagram containers on one page cannot have different message sets.
- **Direction:** Drop the `Record<string, any>` opt-out, have adopters extend via declaration merging, and make the message bundle a container-scoped service.
- **Size:** M
- **Adjacent to:** [#1752](https://github.com/eclipse-glsp/glsp/issues/1752).

### CL-14 · `EditorContextService.modelRoot` throws, making three documented fallbacks dead code

> Filed as [#1793](https://github.com/eclipse-glsp/glsp/issues/1793).

- **Location:** `base/editor-context-service.ts:241-246` (throws `'Model root not available yet'`, typed `Readonly<GModelRoot>`) · `:248-250` (`this.modelRoot ? … : undefined`, whose `undefined` branch is unreachable) · `:261-264` (`this.modelRoot?.canvasBounds ?? Bounds.EMPTY`, with a comment explaining the default)
- **What's wrong:** `viewport` advertises `| undefined` and `canvasBounds` advertises an `EMPTY` default, but both throw before they can return either, so a consumer that guards on `undefined` is wrong, and one that does not is also wrong.
- **Direction:** Make `modelRoot` return `GModelRoot | undefined` (mirroring `IModelChangeService.currentRoot`, which already does) and add an explicit `requireModelRoot()` for the throwing variant.
- **Size:** S

### CL-15 · Listener ranking exists for mouse listeners and not for key listeners

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-16, CL-17, CL-18, CL-24, CL-30, CL-31.

- **Location:** `base/view/mouse-tool.ts:55,65` (rebuilds `rankedMouseListeners` via `Ranked.getRank`, dispatched in rank order at `:77-85`) vs `base/view/key-tool.ts:29-36`, where `GLSPKeyTool` only registers, with no rank bucket
- **What's wrong:** Two structurally identical contribution points, `TYPES.MouseListener` and `TYPES.KeyListener`, both collected in `preLoadDiagram`, have different ordering guarantees, so a key listener's position depends on module load order and cannot be influenced.
- **Direction:** Lift the rank grouping into a shared base, or drop it from both and give listeners an explicit registration priority.
- **Size:** S
- **Cluster:** [input handling](#cluster-input-handling)
- **See also:** [CL-17](#cl-17--keyboard-input-has-no-arbitration-mechanism-precedence-is-hand-coded-in-each-listener). The same asymmetry as a runtime problem.

---

## Runtime model

Ownership of state, ordering, async boundaries and disposal, as opposed to the exported types above.

### CL-16 · Mouse dispatch serializes rank groups across `await`, so `preventDefault` is dead and one failure silences the rest

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-17, CL-18, CL-24, CL-30, CL-31.

- **Location:** `base/view/mouse-tool.ts:74`, `:77-85`, `:87-106`
- **What's wrong:** `handleEvent` calls `notifyListenersByRank` without awaiting, and that method awaits each rank group's action dispatch before invoking the next, so every listener above rank 0 runs in a later microtask, its `event.preventDefault()` (`:94`) no longer reaches the browser, a rejected dispatch in rank 0 aborts all remaining ranks as an unhandled rejection, and promise-returning listener results take a completely different, un-awaited and un-caught path (`:100-102`) from synchronous ones.
- **Direction:** Decide whether mouse listeners are synchronous collectors, gathering all actions across all ranks, calling `preventDefault` once and then dispatching, or genuinely ordered async steps, and make the contract one of the two.
- **Size:** M
- **Cluster:** [input handling](#cluster-input-handling)

### CL-17 · Keyboard input has no arbitration mechanism; precedence is hand-coded in each listener

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-16, CL-18, CL-24, CL-30, CL-31.

- **Location:** `base/view/key-tool.ts:29-36` (adds lazy registration only, no rank) · `features/viewport/viewport-key-listener.ts:41,80` · `features/change-bounds/move-element-key-listener.ts:41` · `features/change-bounds/resize/resize-tool.ts:40`
- **What's wrong:** `GLSPMouseTool` gained a rank model and `GLSPKeyTool` did not. Sprotty's `KeyTool` concatenates the actions of _all_ key listeners and dispatches them all, so the arrow-key conflict between `MoveViewportKeyListener` and `MoveElementKeyListener` (and the `+`/`-` conflict between `ZoomKeyListener` and `ResizeKeyListener`) is resolved by each listener independently checking `selectedElementIds.length === 0`. Every listener hard-codes its rival's precedence rule.
- **Direction:** Give key listeners the same rank/consumption model the mouse tool has, or introduce a keybinding registry that resolves a keystroke to one handler before any listener runs.
- **Size:** M
- **Cluster:** [input handling](#cluster-input-handling)
- **See also:** [CL-15](#cl-15--listener-ranking-exists-for-mouse-listeners-and-not-for-key-listeners).

### CL-18 · Escape and the arrow keys are claimed by half a dozen listeners with no owner

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-16, CL-17, CL-24, CL-30, CL-31.

- **Location:** `base/tool-manager/tool-manager.ts:195` · `features/accessibility/global-keylistener-tool.ts:89` · `features/accessibility/view-key-tools/deselect-key-tool.ts:82` · `features/accessibility/element-navigation/diagram-navigation-tool.ts:273` · `features/accessibility/keyboard-grid/keyboard-grid.ts:163` · `features/accessibility/keyboard-pointer/keyboard-pointer-listener.ts:106` · `features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:460`
- **What's wrong:** At least seven independently registered listeners react to `Escape` and all of them fire on every press, with ordering determined by whatever `KeyTool` registration order DI happened to produce; arrow keys are claimed three times over within a single activation (`keyboard-pointer-listener.ts:115`, `diagram-navigation-tool.ts:282`, `keyboard-tool-palette.ts:365`).
- **Direction:** One "cancel current interaction" concept that a single component owns, with everything else subscribing rather than binding the key.
- **Size:** M
- **Cluster:** [input handling](#cluster-input-handling)

### CL-21 · Keyboard move and resize are a second, independent implementation of change-bounds

> Filed as [#1795](https://github.com/eclipse-glsp/glsp/issues/1795).

- **Location:** `features/change-bounds/move-element-handler.ts:115-135` and `features/change-bounds/resize/resize-handler.ts:101-114` vs `features/tools/change-bounds/change-bounds-tracker.ts:199-274` and `features/tools/change-bounds/change-bounds-manager.ts:202-263`
- **What's wrong:** `MoveElementHandler.getTargetBounds` re-implements snapping and move validation against `ISnapper`/`IMovementRestrictor` directly, bypassing `ChangeBoundsTracker`, `IChangeBoundsManager`, the helper-line manager, the grid manager and the container manager that the mouse path goes through, so a keyboard move and a mouse move of the same element obey different rules, and `ResizeElementHandler` even fabricates a cast model element to reach `toElementAndBounds` (`resize-handler.ts:136`).
- **Direction:** Route keyboard move/resize through the same tracker and manager as the pointer path, leaving the handlers as thin adapters from keystroke to tracked movement.
- **Size:** M
- **Adjacent to:** [#1749](https://github.com/eclipse-glsp/glsp/issues/1749). The split should land on one implementation, not two.

### CL-24 · Tools install document-level listeners in `enable()` that can never be removed

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-16, CL-17, CL-18, CL-30, CL-31.

- **Location:** `features/accessibility/global-keylistener-tool.ts:41-43,45` · `features/accessibility/focus-tracker/focus-tracker-tool.ts:41-51` · contrast `features/accessibility/element-navigation/diagram-navigation-tool.ts:60`
- **What's wrong:** `GlobalKeyListenerTool` registers `document.addEventListener('keyup', this.trigger.bind(this))` behind an `alreadyRegistered` latch without storing the bound function, so it is unremovable by construction and keeps dispatching into a torn-down diagram; `FocusTrackerTool` does the same with `focusin`/`focusout` and states in a comment at `:50` that it "cannot be disabled after enabling it", making it a `TYPES.IDefaultTool` that structurally violates `Tool.disable()`. Both also discard the `Disposable` that `repeatOnMessagesUpdated` returns.
- **Direction:** Make `enable()` return or accumulate disposables as the only legal way to register anything, and drop the latch-flag idiom; a tool that cannot be disabled is not a tool.
- **Size:** S
- **Cluster:** [input handling](#cluster-input-handling)

### CL-25 · Diagram loading can hang forever, and every startup-hook failure is swallowed

> Filed as [#1796](https://github.com/eclipse-glsp/glsp/issues/1796).

- **Location:** `base/model/diagram-loader.ts:199`, `:203-211` · `base/model/model-initialization-constraint.ts:118-125` · `features/viewport/viewport-handler.ts:68-98`
- **What's wrong:** `load()` awaits `modelInitializationConstraint.onInitialized()` with no timeout, and `DefaultModelInitializationConstraint` completes only on an `InitializeCanvasBoundsAction` arriving _after_ a non-empty model action. Meanwhile `invokeStartupHook` catches every hook error, `console.error`s it and continues as if nothing happened. One such hook, `RestoreViewportHandler.postRequestModel`, awaits a `MutationObserver` on `document.body` that is never disconnected if the selector never matches.
- **Direction:** Give initialization a deadline and a failure state the diagram can render, and let a startup hook declare whether its failure is fatal instead of the loader deciding for it.
- **Size:** M
- **Counterpart:** [PROT-11](protocol.md#prot-11--the-protocol-cannot-say-the-model-is-loaded-the-client-infers-it-and-revision-is-optional-but-required), filed as [#1774](https://github.com/eclipse-glsp/glsp/issues/1774). That issue adds the model-ready signal; this one is the client-side inference it replaces. [SRV-16](server.md) is the third leg.

### CL-26 · Type hints are applied by mutating shared feature sets and monkey-patching model methods on every update

> Filed as [#1787](https://github.com/eclipse-glsp/glsp/issues/1787), together with CL-5.

- **Location:** `features/hints/type-hint-provider.ts:92-134`, `:166-172` · Sprotty's per-registration `featureSet` at `sprotty/lib/base/model/smodel-factory.js:46-57`
- **What's wrong:** `ApplyTypeHintsCommand` is a `FeedbackCommand` replayed on every model update; it walks the entire index and calls `addOrRemove(element.features, …)`, but Sprotty creates one `featureSet` per _registration_ and assigns the same object to every instance of that type, so this mutates globally shared state, then assigns closures over `element.canConnect` and `element.isContainableElement`. What a user may move, resize, delete or connect therefore depends on whether the type-hints feedback has been replayed yet, and is carried by patched instance methods rather than by the model type.
- **Direction:** Make type hints a queryable service the tools consult (`canMove(element)`, `canConnect(edge, source, role)`) instead of a command that rewrites model instances.
- **Size:** L
- **Cluster:** [type hints](#cluster-type-hints)
- **Adjacent to:** [#1755](https://github.com/eclipse-glsp/glsp/issues/1755). That issue owns the cost of type-hint replay; this is the design that causes it. See [CL-5](#cl-5--type-hints-are-applied-by-monkey-patching-methods-onto-live-model-instances) for the API-contract half.

### CL-27 · Feedback commands execute under a second, unstated contract

> Filed as [#1789](https://github.com/eclipse-glsp/glsp/issues/1789), together with CL-10.

- **Location:** `base/feedback/feedback-action-dispatcher.ts:153-159` · `features/bounds/set-bounds-feedback-command.ts:56-71` · `features/element-template/add-template-element.ts:68-78` · `features/bounds/local-bounds.ts:54-67`
- **What's wrong:** `applyFeedbackCommands` calls `command.execute(context)` directly and discards the return value, so the `CommandResult` contract (`modelChanged`, a replacement root, `cause`) that holds on the dispatch path silently does not hold on the replay path. A feedback command must mutate `context.root` in place or have no effect. Several feedback commands also dispatch _new_ actions from inside `execute` (`LocalRequestBoundsAction.fromCommand`), so every model update re-triggers a hidden-bounds round trip from inside command execution.
- **Direction:** Either make replay honour the same contract as dispatch, or split feedback into a distinct "decorator" type that is explicitly in-place and side-effect-free, so the two are not the same class.
- **Size:** M
- **Cluster:** [feedback](#cluster-feedback)
- **Adjacent to:** [#1750](https://github.com/eclipse-glsp/glsp/issues/1750). That issue owns the emitter API; this is the command-side contract underneath it.

### CL-28 · The `ServerAction` marker doubles as a "do not forward" flag, and is set by lying

> Filed as [#1797](https://github.com/eclipse-glsp/glsp/issues/1797), together with CL-29.

- **Location:** `base/model/glsp-model-source.ts:42-58`, `:235-237` · `features/bounds/local-bounds.ts:70-80`, `:42`
- **What's wrong:** Whether an action goes to the server is decided by a hidden mutable property stamped onto the action object (`__receivedFromServer`), and `LocalComputedBoundsAction.mark` sets it on a _client-produced_ action with the comment "mimic: we mark the computed bounds action as coming from the server so it is not sent to the server", so one boolean carries two contradictory meanings, and `LocalRequestBoundsAction.is` has to test for its absence to distinguish a local bounds request from a server one.
- **Provenance:** The marker itself is Sprotty's (`sprotty/lib/model-source/diagram-server.js:46,100,129`), but there it means one thing, "this arrived from the server", and is only ever set on receipt. The second meaning is GLSP's addition, and so is the lie that carries it. See the provenance note on [PROT-4](protocol.md#prot-4--message-direction-is-implemented-by-mutating-the-payload-with-__-prefixed-markers): `GLSPModelSource` extends `ModelSource`, not `DiagramServerProxy`, so no Sprotty code reads this property and nothing outside GLSP depends on the overload.
- **Direction:** Split the two meanings. Provenance becomes the declared `origin` field of [PROT-4](protocol.md#prot-4--message-direction-is-implemented-by-mutating-the-payload-with-__-prefixed-markers), set by the transport on receipt and never set by anything else, which is what makes `LocalComputedBoundsAction.mark` impossible to write as a lie. Routing becomes explicit at dispatch (`dispatchLocal`, or a destination in the handler registry), so "do not send this" is stated rather than implied by a false provenance. `LocalRequestBoundsAction.is` then tests a real property instead of a marker's absence.
- **Size:** M
- **Counterpart:** [PROT-4](protocol.md#prot-4--message-direction-is-implemented-by-mutating-the-payload-with-__-prefixed-markers), filed as [#1769](https://github.com/eclipse-glsp/glsp/issues/1769). That issue declares the `origin` field; this one splits the two meanings the marker carries and removes the lie.
- **Cluster:** [client and server action flow](#cluster-client-and-server-action-flow)

### CL-29 · Actions received from the server are dispatched without `await` or `catch`

> Filed as [#1797](https://github.com/eclipse-glsp/glsp/issues/1797), together with CL-28.

- **Location:** `base/model/glsp-model-source.ts:166-178` · contrast the request branch directly below at `:181-198`
- **What's wrong:** `messageReceived` ends in a bare `this.actionDispatcher.dispatch(action)`, so any handler that throws, including the deliberate `Missing handler for action` throw at `base/action-dispatcher.ts:177`, becomes an unhandled promise rejection with no user-visible effect and no path back to the server. The request branch immediately below does exactly the right thing, which shows the asymmetry is unintentional.
- **Direction:** Route server-pushed actions through the same failure handling as server requests, with one place deciding what a client-side handling failure means.
- **Size:** S
- **Cluster:** [client and server action flow](#cluster-client-and-server-action-flow)
- **Adjacent to:** [#1753](https://github.com/eclipse-glsp/glsp/issues/1753) / [#1632](https://github.com/eclipse-glsp/glsp/issues/1632). Those own the wire format; this is a local missing `catch`.

### CL-30 · `dispose()` is overloaded as "reset state" on mouse listeners, so tool state has no defined lifetime

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-16, CL-17, CL-18, CL-24, CL-31.

- **Location:** `features/tools/change-bounds/change-bounds-tool.ts:388,406-409` · `features/tools/change-bounds/change-bounds-tool-move-feedback.ts:221,226` · `features/tools/edge-edit/edge-edit-tool.ts:219,305` · the asymmetry at `edge-edit-tool.ts:95-101`
- **What's wrong:** `ChangeBoundsListener.selectionChanged` calls `this.dispose()`, `FeedbackMoveMouseListener.draggingMouseUp` calls `this.dispose()`, and `EdgeEditListener.mouseDown` calls `this.dispose()` then immediately re-registers listeners. In every case the object stays registered on the mouse tool and is used again. So `dispose` means "reset" here and "tear down" when the same object is pushed onto `toDisposeOnDisable` (`change-bounds-tool.ts:111`). The same overload hides a bug: `EdgeEditTool.deregisterFeedbackListeners` disposes the source and target listeners but not `feedbackMovingListener`.
- **Direction:** Separate `reset()` (end of one interaction) from `dispose()` (end of the listener's life), and let `DisposableCollection` mean only the latter.
- **Size:** S
- **Cluster:** [input handling](#cluster-input-handling)

### CL-31 · Drag state lives per-listener with no pointer capture; recovery is an ad-hoc re-entry hack

> Filed as [#1794](https://github.com/eclipse-glsp/glsp/issues/1794), together with CL-15, CL-16, CL-17, CL-18, CL-24, CL-30.

- **Location:** `base/drag-aware-mouse-listener.ts:38-75` · `features/tools/change-bounds/change-bounds-tool-move-feedback.ts:70-83`
- **What's wrong:** Each `DragAwareMouseListener` tracks `_isMouseDown`/`_isMouseDrag` from SVG-scoped events only, so releasing the button outside the diagram never delivers `mouseUp` and leaves every such listener stuck mid-drag. `FeedbackMoveMouseListener` works around exactly this by calling `draggingMouseUp` from inside `mouseDown` when it finds itself still tracking (`:73-77`, with a comment naming the cause), while `ChangeBoundsListener` has no such recovery at all.
- **Direction:** One gesture owner using pointer capture (`setPointerCapture`, or a window-level `pointerup`) that begins and ends a drag for all participants, instead of N listeners each reconstructing it.
- **Size:** M
- **Cluster:** [input handling](#cluster-input-handling)

---

## DI & module architecture

Client-only DI problems. The client-vs-server composition split is [X-1](cross-cutting.md#x-1--client-and-server-use-unrelated-di-composition-models-and-aligning-them-needs-a-project-level-decision);
module load order is [X-2](cross-cutting.md#x-2--module-load-order-is-load-bearing-everywhere-and-every-ordering-failure-is-silent).

### CL-32 · `LazyInjector` has institutionalized the service locator, with `TYPES.EmptyArray` injected to satisfy inversify

> Filed as [#1790](https://github.com/eclipse-glsp/glsp/issues/1790), together with CL-11, CL-33.

- **Location:** `packages/client/glsp-sprotty/src/types.ts:30` (`EmptyArray`, with its explanatory comment) · `base/default.module.ts:151` · `base/view/mouse-tool.ts:45,50` · `base/view/key-tool.ts:25` · `base/action-handler-registry.ts:28-29,47-52` · `base/ui-extension/ui-extension-registry.ts:26` · `base/tool-manager/tool-manager.ts:102-107` · `base/editor-context-service.ts:170-175`
- **What's wrong:** Five core registries take `@inject(TYPES.EmptyArray)`, a symbol bound to `[]` purely to satisfy a superclass constructor, and then harvest their real contributions later via `lazyInjector.getAll(...)` inside `preLoadDiagram`. Contribution sets are therefore frozen at one arbitrary point in the load sequence, invisible to the container's dependency graph, and impossible to inspect or validate; 15 client files depend on `LazyInjector` despite its own doc saying "use with caution".
- **Direction:** Break the actual cycle (dispatcher ↔ registry ↔ handlers) by inverting registration, so handlers register themselves through a contribution binding, rather than working around it with a container handle.
- **Size:** L
- **Counterpart:** [PROT-17](protocol.md#prot-17--defaultlazyinjector-shares-one-cache-between-get-and-getall-and-caches-misses-forever), filed as [#1780](https://github.com/eclipse-glsp/glsp/issues/1780). That issue fixes the cache defects in the implementation; this one is whether the client should depend on it at all.
- **Cluster:** [DI and service identifiers](#cluster-di-and-service-identifiers)

### CL-33 · `TYPES` is a grab bag with dead entries, and half the client's services are not in it

> Filed as [#1790](https://github.com/eclipse-glsp/glsp/issues/1790), together with CL-11, CL-32.

- **Location:** `packages/client/glsp-sprotty/src/types.ts:25-73`
- **What's wrong:** `TYPES` spreads Sprotty's table and adds 35 mixed entries: services, listeners, tools, UI options (`Grid`, `ZoomFactors`, `IHelperLineOptions`), an inversify workaround (`EmptyArray`) and deprecated aliases. `IToolFactory` and `ISModelRootListener` are referenced nowhere; `IMovementOptions` is injected (`change-bounds-tool.ts:98`) but never bound. Meanwhile ~25 other services are identified by their concrete class (`EditorContextService` is injected 23 times, `SelectionService` 15), so there is no rule an adopter can apply to know which identifier to rebind.
- **Direction:** One stated convention, namely a symbol per contract and a class only for leaf implementations, plus a `TYPES` grouped by concern, and deletion of the entries nothing uses.
- **Size:** M
- **Cluster:** [DI and service identifiers](#cluster-di-and-service-identifiers)
- **See also:** [CL-35](#cl-35--the-sprotty-seam-owns-the-service-identifiers-of-the-layer-above-it). The same table as a layering problem.

## Layering & internal structure

### CL-35 · The Sprotty seam owns the service identifiers of the layer above it

> Filed as [#1785](https://github.com/eclipse-glsp/glsp/issues/1785), together with CL-1, CL-9.

- **Location:** `packages/client/glsp-sprotty/src/types.ts:25-75`, where `TYPES` declares `IChangeBoundsManager`, `IHelperLineManager`, `IGridManager`, `IDebugManager`, `IDiagramExporter`, `IShortcutManager`, `IAutocompleteSuggestionProviderRegistry`, …
- **What's wrong:** Every service defined in `@eclipse-glsp/client` has its identity declared one layer down, in the 8-file Sprotty-adapter package, so adding a client feature means editing the seam. The server keeps its identifiers in the same package as its features (`packages/server/server/src/common/di/service-identifiers.ts`).
- **Direction:** Keep only the Sprotty-augmenting identifiers in the seam and let the client contribute its own through a mergeable `TYPES` extension.
- **Size:** M
- **Cluster:** [the Sprotty seam](#cluster-the-sprotty-seam)
- **See also:** [CL-33](#cl-33--types-is-a-grab-bag-with-dead-entries-and-half-the-clients-services-are-not-in-it).

### CL-36 · Client `utils/` is a 42-fan-in sink that depends upward on `features/`

> Filed as [#1798](https://github.com/eclipse-glsp/glsp/issues/1798).

- **Location:** `utils/gmodel-util.ts:44` (`import { ResizeHandleLocation } from '../features/change-bounds/model'`, used only at `:352`) · `utils/marker.ts:17` → `features/validation` · `utils/layout-utils.ts:17` → `features/change-bounds`
- **What's wrong:** The lowest-level utility module, imported by 42 modules and importing nothing else, reaches up into three feature directories, producing the `utils ↔ features/change-bounds ↔ base/feedback` cycle (`features/change-bounds/model.ts:29-30`, `base/feedback/css-feedback.ts:18`) and making `utils` un-extractable.
- **Direction:** Move the three types that cause the upward edges (`ResizeHandleLocation`, marker types, layout types) down into `base/` or `model.ts`, leaving `utils` leaf-only.
- **Size:** S

---

## Cluster: type hints

Two views of one mechanism: the type-hint provider rewrites live model instances. CL-5 is what that does to the API contract, CL-26 is what it does at runtime. Neither is fixable without the other.

- [CL-5](#cl-5--type-hints-are-applied-by-monkey-patching-methods-onto-live-model-instances): monkey-patching `isContainableElement` and `canConnect` onto instances, silently replacing an adopter's own implementations.
- [CL-26](#cl-26--type-hints-are-applied-by-mutating-shared-feature-sets-and-monkey-patching-model-methods-on-every-update): mutating feature sets Sprotty shares across every instance of a type, on every model update.

---

## Cluster: client and server action flow

Both live in `base/model/glsp-model-source.ts` and describe how actions cross the boundary.

- [CL-28](#cl-28--the-serveraction-marker-doubles-as-a-do-not-forward-flag-and-is-set-by-lying): the `ServerAction` marker doubles as a do-not-forward flag and is set by lying about provenance.
- [CL-29](#cl-29--actions-received-from-the-server-are-dispatched-without-await-or-catch): actions received from the server are dispatched without `await` or `catch`, so a throwing handler becomes an unhandled rejection.

---

## Cluster: the Sprotty seam

What `glsp-sprotty` re-exports, and what it owns that it should not. The fixes are the same curation pass.

- [CL-1](#cl-1--eclipse-glspclient-re-exports-the-whole-of-sprotty-as-its-own-public-api): `@eclipse-glsp/client` re-exports all of Sprotty, so a Sprotty patch release can change GLSP's API.
- [CL-9](#cl-9--autocompletesuggestionregistry-can-only-be-implemented-by-extending-a-sprotty-class): `AutocompleteSuggestionRegistry` can only be implemented by extending a Sprotty class.
- [CL-35](#cl-35--the-sprotty-seam-owns-the-service-identifiers-of-the-layer-above-it): the seam declares the service identifiers of the layer above it.

---

## Cluster: DI and service identifiers

How the client registers, finds and overrides services. All three land in `TYPES`, `LazyInjector` and the registries that use them.

- [CL-11](#cl-11--five-contribution-points-five-different-override-policies-none-stated-in-the-api): five contribution points with five different override policies, none stated in the API.
- [CL-32](#cl-32--lazyinjector-has-institutionalized-the-service-locator-with-typesemptyarray-injected-to-satisfy-inversify): `LazyInjector` as an institutionalized service locator, with `TYPES.EmptyArray` bound to satisfy inversify.
- [CL-33](#cl-33--types-is-a-grab-bag-with-dead-entries-and-half-the-clients-services-are-not-in-it): `TYPES` is a grab bag with dead entries, and half the client's services are not in it.

---

## Cluster: feedback

What a feedback key is and what a feedback command may assume.

- [CL-10](#cl-10--empty-marker-interfaces-make-their-type-guards-no-ops-and-let-anything-be-a-feedback-key): empty marker interfaces make their guards no-ops and let any object be a feedback key.
- [CL-27](#cl-27--feedback-commands-execute-under-a-second-unstated-contract): feedback commands execute under a second, unstated contract on the replay path.

---

## Cluster: input handling

Seven findings describe one subject from different angles: what the mouse and key listener contracts actually
guarantee. Filing them separately would produce seven tickets whose fixes all land in `base/view/mouse-tool.ts`,
`base/view/key-tool.ts` and the listeners that register with them, so they are marked here as candidates for one
consolidated ticket.

They split into two groups, which is the natural seam if one ticket turns out to be too large.

**Dispatch and arbitration.** What runs, in what order, and who wins.

- [CL-15](#cl-15--listener-ranking-exists-for-mouse-listeners-and-not-for-key-listeners): ranking exists for mouse listeners and not for key listeners. The API-shape half.
- [CL-16](#cl-16--mouse-dispatch-serializes-rank-groups-across-await-so-preventdefault-is-dead-and-one-failure-silences-the-rest): mouse dispatch serializes rank groups across `await`, so `preventDefault` never reaches the browser and one rejected dispatch aborts the remaining ranks.
- [CL-17](#cl-17--keyboard-input-has-no-arbitration-mechanism-precedence-is-hand-coded-in-each-listener): keyboard input has no arbitration mechanism, so precedence is hand-coded in each listener. The runtime half of CL-15.
- [CL-18](#cl-18--escape-and-the-arrow-keys-are-claimed-by-half-a-dozen-listeners-with-no-owner): `Escape` and the arrow keys are claimed by half a dozen listeners with no owner, which is what CL-17 costs in practice.

**Listener lifetime and state.** What a listener owns and when it stops owning it.

- [CL-24](#cl-24--tools-install-document-level-listeners-in-enable-that-can-never-be-removed): document-level listeners installed in `enable()` that cannot be removed by construction.
- [CL-30](#cl-30--dispose-is-overloaded-as-reset-state-on-mouse-listeners-so-tool-state-has-no-defined-lifetime): `dispose()` overloaded as "reset state", so tool state has no defined lifetime.
- [CL-31](#cl-31--drag-state-lives-per-listener-with-no-pointer-capture-recovery-is-an-ad-hoc-re-entry-hack): drag state per listener with no pointer capture, so a button released outside the diagram leaves listeners stuck mid-drag.

Deliberately not in the cluster: [CL-21](#cl-21--keyboard-move-and-resize-are-a-second-independent-implementation-of-change-bounds) is keyboard against mouse, but the subject is change-bounds duplication rather than input dispatch, and it is already adjacent to [#1749](https://github.com/eclipse-glsp/glsp/issues/1749). The tool-activation and coordination findings went to that issue for the same reason.

---

## Withdrawn and folded

**Accessibility features exist twice, as six `FeatureModule`s nobody loads and as six `configure*` functions** (the
previous `CL-34`). The accessibility API is still experimental and is due to be reworked as a whole, which is outside
the 3.0 effort. Recording a finding against its current shape would only describe code that is going away. Not acted
on here; it belongs to that rework.

**`initializeDiagramContainer` ships without a counterpart, so every `@preDestroy` in the client is unreachable**
(the previous `CL-23`). It recorded that nothing in this repository calls `container.unbindAll()` or `unload()`, and
concluded that the 16 `@preDestroy` hooks never run and that each closed diagram leaks a server session.

The observation is true of `glsp-core` and the conclusion is not. The Theia and VS Code integrations tear diagram
containers down with `container.unload()`, which is where `@preDestroy` fires and the session is disposed. The
standalone example never unloads because its diagram container lives exactly as long as the application, so there is
nothing to tear down. No separate `disposeDiagramContainer` is needed: `unload()` is the counterpart. This is the
second withdrawal, after `CL-8`, caused by drawing a usage conclusion from a scope that excludes the integrations.

**`ExternalMarkerManager` is an extension point nothing binds, connects, or can implement without subclassing** (the
previous `CL-8`). It recorded that no module binds the class, that `connect(actionDispatcher)` is called from nowhere,
and that `languageLabel` is never assigned.

Every one of those observations is true of `glsp-core` and none of them supports the conclusion. The consumer is the
Theia integration, which this review does not read, and the class says so in its own TSDoc: "Typically this is rebound
by the surrounding tool, e.g. Theia, to be aware of and propagate current markers" (`validate.ts:61-64`). The seam is
bidirectional by design. Core pushes markers down through `setMarkers`, the only member core calls (`:105`), and the
integration pushes deletions back up through the dispatcher it receives in `connect`. `removeMarkers` and
`languageLabel` belong to that second direction, which is why nothing here touches them.

The proposed direction was also mispriced. Replacing the abstract class with an `IExternalMarkerManager` interface
behind a `TYPES` symbol would break the downstream subclass, making it a coordinated change across repositories rather
than the S it was labelled.

One observation survives and is in the appendix: `languageLabel: string` is declared non-optional on a class whose
implementers live in another repository, and `strictPropertyInitialization` is off workspace-wide ([X-11](cross-cutting.md)).

**Cross-component coordination is done by sniffing the action stream for hardcoded tool IDs** (the previous `CL-20`)
and **readonly is a convention applied ad hoc, not an enforced invariant** (the previous `CL-22`). The first recorded
that `GLSPScrollMouseListener` and `GlspHoverMouseListener` each watch for `EnableToolsAction` and compare `toolIds`
against a hardcoded `MarqueeMouseTool.ID` or `EdgeCreationTool.ID` to flip a private flag, that `HelperLineManager`
infers move state by matching `MoveAction` and `SetBoundsAction` kinds, that none of it sees anything when a tool is
enabled through `IToolManager.enable()` directly, and that `GLSPScrollMouseListener` never resets `preventScrolling`
when a different tool is enabled. The second recorded that the only systematic readonly check is `ToolManager.enable`
filtering `isEditTool`, so `ServerCopyPasteHandler` sends `CutOperation` and `PasteOperation` from unconditional
`window` listeners with no check, while the context-menu path for the same two operations does check.

Both folded into [#1749](https://github.com/eclipse-glsp/glsp/issues/1749). `CL-20` is the other half of `CL-19`: once
a tool declares what it claims, the manager knows the active interaction, and the components that reverse-engineer it
from the action stream can ask instead. `CL-22` reaches further, because its fix moves enforcement onto the dispatch
path shared by every handler, but it belongs to this ticket while the tool manager holds the only systematic check,
and taking that responsibility off the tool API is part of deciding what the tool API is. Nothing is left over.

**Tool activation is binary: enabling any tool disables every default tool** (the previous `CL-19`). It recorded that
`ToolManager.enable(toolIds)` unconditionally calls `disableActiveTools()` first (`tool-manager.ts:144-145`), so
starting node creation also disables `ViewportKeyTool`, `DirectLabelEditTool`, `DelKeyDeleteTool`, `MarqueeTool` and
`EdgeEditTool`, and that nothing in the `Tool` contract describes what input a tool claims, so the manager has no
basis for a narrower decision.

Folded into [#1749](https://github.com/eclipse-glsp/glsp/issues/1749) along with the former `CL-6`. Activation
semantics and tool decomposition are the same API: "replaceable independently" and "enabled independently" are
answered by the same `Tool` contract, and both need a tool to say what it claims rather than the manager assuming.
Nothing is left over.

**Tools wire their listeners with positional constructors and hand out `this` as a concrete class** (the previous
`CL-6`). It recorded that `EdgeCreationTool` (`:73-79`, `:103`), `ChangeBoundsTool` (`:152-162`, `:178`),
`EdgeEditTool` (`:72-77`, `:118`) and `NodeCreationTool` (`:88`) each build their listener from an undocumented
positional argument list and pass `this` typed as the concrete tool, so a listener is reusable only with the exact
class it was written against. The one counter-example sits in the same file: `NodeInsertTrackingListener`
(`node-creation-tool.ts:97-105`) depends on the `ContainerPositioningTool` *interface*.

Folded into [#1749](https://github.com/eclipse-glsp/glsp/issues/1749), which was rescoped from splitting
`ChangeBoundsTool` to improving the tool API and implementation generally. The two belong together because they touch
the same four classes, and because narrowing a listener to a capability interface is most of what "replaceable
independently" means. Nothing is left over.

**`configureActionHandler` cannot relate an action kind to the handler that claims it** (the previous `CL-4`). It
recorded that handlers narrow `handle(action: Action)` to one concrete action type, which method bivariance permits,
while the binding API accepts any `string` kind, so registering a handler under the wrong kind compiles and fails at
dispatch. It proposed inferring the action type from the handler and constraining the kind to it.

That does not describe how handlers are used. Counting the 71 `configureActionHandler` calls in
`packages/client/client/src`, **13 of the 43 distinct handlers are registered for more than one kind**:
`ClosePopupActionHandler` for six (`CenterCommand`, `FitToScreenCommand`, `FocusStateChangedAction`, `MoveCommand`,
`SetPopupModelCommand` and one more), `TYPES.IHelperLineManager` and `KeyboardToolPalette` for five each,
`FallbackActionHandler` for four. There is no one-to-one relation between a handler and an action kind to express.

For those handlers the proposal offers a choice between two worse options. Declare a hand-written union in the class
and keep it in sync with registration sites the compiler cannot see together, which only checks that each
registration is a *member* of the union and never that the union is complete. Or declare `handle(action: Action)` and
get no check at all, which is what they do today. `ClosePopupActionHandler` and `FallbackActionHandler` are
kind-agnostic by design; making them name six action types to satisfy a binding helper is worse than the gap it
closes.

What is left is a type-safety hole with no observed instance and no available fix, which is not a finding. The
measurement is worth keeping, because it constrains any future attempt to type this relation, and it is the kind of
thing [X-14](cross-cutting.md) says should be recorded where the decision is made.

**A container built by `initializeDiagramContainer` cannot render anything** (the previous `CL-3`, hence the gap in
the numbering). It recorded that `DEFAULT_MODULES` (`default-modules.ts:67-108`) binds no views, so an adopter has to
know to call `configureDefaultModelElements` by hand, and proposed either folding `baseViewModule` into
`DEFAULT_MODULES` or deleting it.

The first half is wrong, and the reason is the point. `configureDefaultModelElements` is the intended way to register
defaults precisely because it is a function call and not a module. An adopter calls it and then overrides individual
types, or does not call it and registers only what their language needs. Putting the views in `DEFAULT_MODULES` would
load all of them for everyone, and a binding loaded by a module can be overridden but not removed, so the choice of
which defaults to take would disappear. `baseViewModule` is a three-line wrapper that calls
`configureDefaultModelElements(context)` with no parameters (`views/base-view-module.ts:56-62`), which is exactly the
all-or-nothing form the current design avoids.

What is left is smaller than a finding and is in the appendix: `baseViewModule` is declared once and referenced
nowhere in the workspace, yet it is public API, so the barrel offers a second way to do this that nobody should take.

---

## Related findings in other components

Client behaviour is also shaped by findings owned elsewhere:

- [PROT-17](protocol.md): `DefaultLazyInjector` returns a single instance typed as an array and caches misses forever. The client is its only heavy user ([CL-32](#cl-32--lazyinjector-has-institutionalized-the-service-locator-with-typesemptyarray-injected-to-satisfy-inversify)).
- [PROT-16](protocol.md): `glsp-sprotty` imports the DI API through `@eclipse-glsp/protocol/lib/di`.
- [PROT-19](protocol.md) / [PROT-20](protocol.md): the browser bundle's Node dependency, and the `decorate()` import side effect the client triggers.
- [PROT-4](protocol.md): the `__`-marker direction mechanism, of which [CL-28](#cl-28--the-serveraction-marker-doubles-as-a-do-not-forward-flag-and-is-set-by-lying) is the client half.
- [E2E-2](e2e.md): the e2e page objects address the client's DOM through styling classes; the fix adds `data-testid`, ARIA state and a `data-glsp-mode` attribute to published client DOM.
- [TOOL-1](tooling.md): the Sprotty-import ban inside `packages/client/client` is a warning, not an error.
- [X-1](cross-cutting.md) … [X-8](cross-cutting.md): DI composition, module ordering, scope defaults and the four naming conventions.

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

### Public API

- `ExternalMarkerManager.languageLabel` (`features/validation/validate.ts:69`) is declared `languageLabel: string`, non-optional, but is assigned and read nowhere in this repository because its implementers are downstream. With `strictPropertyInitialization` off ([X-11](cross-cutting.md)) a subclass that omits it gets `undefined` typed as `string`. Either `abstract languageLabel: string`, which forces subclasses to declare it and is a breaking change for them, or `languageLabel?: string`, which is honest about the current state. Needs the integration's input.
- `baseViewModule` (`views/base-view-module.ts:56`) is declared once and referenced nowhere in the workspace, yet it is exported from the barrel (`index.ts:252`) and is therefore public API. It wraps `configureDefaultModelElements` with no parameters, which is the all-or-nothing form the [withdrawn `CL-3`](#withdrawn-and-folded) explains the current design deliberately avoids. Dropping it at the major boundary would leave one documented way to register defaults instead of two, one of which nobody should use.
- `base/tool-manager/tool.ts:50`: `EnableDefaultToolsAction.is` is declared `object is EnableToolsAction`; `tool-manager.ts:188` and `hover.ts:59` compensate with `action as EnableToolsAction` casts.
- `base/model/glsp-model-source.ts:69`: `OptionalAction.is` is declared `object is ServerAction`.
- `base/tool-manager/tool-manager.ts:136,158,162`: `tool()`, `disableEditTools()` and `enableDefaultTools(force)` are absent from or wider than `IToolManager` (`:43-79`), so `TYPES.IToolManager` consumers cannot reach them. Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `features/copy-paste/copy-paste-handler.ts:38` declares `put(data, id?: string)` while `LocalClipboardService.put` at `:68` requires `id: string`; calling through the interface without an id makes every later `get(someId)` return `undefined`.
- `features/accessibility/keyboard-pointer/keyboard-pointer.ts:32`: the framework defaults `elementTypeId` to `'task:automated'`, a Workflow-example type, in a published package.
- `features/accessibility/keyboard-pointer/keyboard-pointer.ts:38-39`: `@inject(TYPES.IContainerManager) containerManager: ContainerManager` declares the concrete class for an interface symbol; rebinding `IContainerManager` to a non-subclass type-checks and breaks only here.
- `base/feedback/update-model-command.ts:53`: `applyFeedbackCommands` returns a promise discarded inside a synchronous `performUpdate`, so async feedback commands race the model update. Adjacent to [#1750](https://github.com/eclipse-glsp/glsp/issues/1750).
- `features/tools/base-tools.ts:105-118`: `BaseCreationTool.isTriggerAction: (obj: any) => obj is T` uses `any`, and `triggerAction: T` is declared non-optional but is `undefined` until `handle()` fires, which `enable()` then reports as a `TypeError`.
- `features/change-bounds/snap.ts:20`: the deprecation points at `{@link ChangeBoundsManager.useSnap}`, which does not exist; the member is `usePositionSnap`. Adjacent to [#1747](https://github.com/eclipse-glsp/glsp/issues/1747).
- `features/element-template/mouse-tracking-element-position-listener.ts:39`: `PositioningTool extends FeedbackAwareTool`, whose `registerFeedback`/`deregisterFeedback` (`base-tools.ts:42,52`) are both `@deprecated`, so implementing a positioning tool means implementing two deprecated methods.
- `utils/argument-utils.ts:67`: `getArguments` filters with `if (value)`, dropping `0`, `false` and `''`; `getNumbers`/`getBooleans` therefore return short arrays and `CornerRadius.from` (`:118-128`) silently degrades a `radiusTopRight: 0` to a uniform radius. Same shape as `ArgsUtil` on the server; see [cross-cutting.md](cross-cutting.md#truthiness-instead-of-definedness).
- `base/auto-complete/auto-complete-widget.ts:90-110`: a 6-positional-argument constructor plus two side-channel `configure*` methods; the call site at `base/auto-complete/base-autocomplete-palette.ts:62-72` shows the cost.
- `base/auto-complete/auto-complete-widget.ts:47-49`: `InputValueInitializer` is exported public API referenced nowhere in the repository.
- `base/auto-complete/auto-complete-widget.ts:65`: `const configureAutocomplete: … = require('autocompleter')` is the one CommonJS `require` left in shipped source, so it has to be resolved before the package can be ESM. Adjacent to [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).
- `features/tools/edge-edit/edge-edit-tool.ts:89-101`: `registerFeedbackListeners()`/`deregisterFeedbackListeners()` are public but throw before `enable()` has run, and exist only so the listener can call back into its own tool.
- `features/tools/change-bounds/change-bounds-tool.ts:110-145`: factory return types (`MouseListener`, `KeyListener`) are narrower than what the code requires, so `enable()` probes its own extension points with `Disposable.is` / `ISelectionListener.is`, including at `:143` where the declared type at `:160` already guarantees it.
- `features/tools/change-bounds/change-bounds-tracker.ts:459,475`: `(this as any).parent = handle.parent` in the exported `MoveableResizeHandle` / `MoveableRoutingHandle`.
- `features/change-bounds/model.ts:124-126`: `GResizeHandle.hasFeature` returns `feature === hoverFeedbackFeature` without consulting the base class, so `enableFeatures()` on a resize handle is silently a no-op.
- `features/bounds/layouter.ts:54-59`: `StatefulLayouterExt` shadows the base class's state as `elementToBoundsData` / `layoutRegistry2`; the workaround name is part of the public constructor signature.
- `packages/client/glsp-sprotty/src/layout-override.ts:33`: `ILayout.orderAgnostic` is optional with one consumer (`features/zorder/bring-to-front-command.ts:38`) that defaults it to `true`, so a custom layout silently opts into z-reordering.
- `features/tools/edge-creation/edge-creation-tool.ts:51`: `@optional() @inject(TYPES.Grid) protected grid: Grid` declares a non-optional type for an optional binding; `tool-palette.ts:82-84` gets the same pattern right.
- `base/shortcuts/shortcuts-manager.ts:44,53`: `getShortcuts()` and the `onDidChange` payload hand out the live `registrations` map behind a `ReadonlyMap` annotation.
- `base/model/glsp-model-source.ts:204`: `initialize(registry: GLSPActionHandlerRegistry)` narrows Sprotty's `ActionHandlerRegistry` parameter; `createInitializeClientSessionParameters` at `:144` calls `getHandledActionKinds()` with no guard.
- `base/drag-aware-mouse-listener.ts:58,62` are `protected` while `:77,81` are public, within one override contract.
- `features/layout/layout-elements-action.ts:108-114`: `ReduceFunction.get` indexes a closed namespace, so the exported `ReduceFunctionType` on `ResizeElementsAction` cannot carry an adopter-supplied reduce function.
- `base/view/mouse-tool.ts:43,82`: `rankedMouseListeners` is assigned only by `register`/`deregister`, so `notifyListenersByRank` iterates `undefined` if an event arrives before any listener registers.
- `base/default.module.ts:78,98,116,123`: `EditorContextService`, `GLSPMouseTool`, `DiagramLoader` and `SelectionService` are bound to themselves as service identifiers while `IToolManager`, `IModelChangeService` and `IFeedbackActionDispatcher` sit behind symbols; only the latter can be replaced without rebinding a concrete class. Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `packages/client/glsp-sprotty/src/types.ts:37`: `TYPES.IToolFactory` is exported and used nowhere in the repository.
- `features/hover/hover.ts:59`: `GlspHoverMouseListener` names `EdgeCreationTool.ID` directly to decide whether hover is enabled. Adjacent to [#1471](https://github.com/eclipse-glsp/glsp/issues/1471).
- `utils/gmodel-util.ts:387`: `export const ALL_ROUTING_POINTS = undefined`, typed `undefined`, as public API.

### Runtime

- Multiple handlers for one action kind are invoked "in one burst" without awaiting between them, and each may set the shared `blockUntil`, so effect ordering is promise-settle order and the last command's block predicate wins (`base/action-dispatcher.ts:180-207`).
- `IToolManager.enable` documents a fallback to the default tools when no tool matches, but the implementation silently leaves _no_ tool active for an unknown id (`base/tool-manager/tool-manager.ts:56-66` vs `:144-156`).
- `FocusTracker` is bound as `TYPES.IDiagramStartup` but implements no startup hook: a dead binding (`base/default.module.ts:90`).
- `ToolPalette` declares `implements IEditModeListener` but is never bound to `TYPES.IEditModeListener`; it subscribes manually in `postConstruct` instead (`features/tool-palette/tool-palette.ts:70,110`, `tool-palette-module.ts:21-28`).
- Three parallel ways to become a selection listener: the `TYPES.ISelectionListener` multibinding (`base/selection-service.ts:87`), `selectionService.addListener` from `postConstruct` with the disposable discarded (`features/helper-lines/helper-line-manager.ts:134`), and the raw `onSelectionChanged` event.
- `FeedbackMoveMouseListener.moveInitializationTimeout()` is an overridable hook nothing calls: the 750 ms is hardcoded three lines above it (`features/tools/change-bounds/change-bounds-tool-move-feedback.ts:101-110`).
- `GLSPHiddenBoundsUpdater` reaches into a Sprotty private field by string index to get the bounds map (`features/bounds/glsp-hidden-bounds-updater.ts:73-75`).
- `ChangeBoundsTracker.calculateElementBounds` mutates its `handleMove.moveVector` argument in place, and that same object is then used for CSS feedback (`features/tools/change-bounds/change-bounds-tracker.ts:361,365-366`).
- `startTracking()` silently no-ops when `MousePositionTracker` has no last position, so `isTracking()` is false and the whole move is dropped without a log (`features/change-bounds/tracker.ts:48-53`, `change-bounds-tracker.ts:176-188`).
- Model elements are mutated outside any command: `element.position` from a mouse listener (`features/element-template/mouse-tracking-element-position-listener.ts:98`) and `element.bounds` from the edge router during rendering (`features/routing/edge-router.ts:125`).
- `MarqueeMouseListener` caches the markable node/edge list from the root at construction time, so it works against a stale model if an update arrives while the marquee is active (`features/tools/marquee-selection/marquee-mouse-tool.ts:64-66`).
- `MarqueeKeyListener` switches tools on _any_ keydown while Shift is held, not on a Shift keystroke (`features/tools/marquee-selection/marquee-tool.ts:49-54`).
- `EdgeCreationToolMouseListener.canConnect` fires a server request from a synchronous mouse listener and dispatches the late result without checking whether the tool was disabled meanwhile; `dispose()` does not clear `pendingDynamicCheck` (`features/tools/edge-creation/edge-creation-tool.ts:219-234,241-249`). Adjacent to [#1470](https://github.com/eclipse-glsp/glsp/issues/1470).
- `NodeCreationToolMouseListener.cursorFeedback` and `EdgeCreationToolMouseListener.cursorFeedback` are constructed and disposed but never written to: dead emitters (`node-creation-tool.ts:132`, `edge-creation-tool.ts:109`).
- `SearchAutocompletePalette.deleteAllCSS` builds one action per element in the whole index and dispatches them all (`features/search-palette/search-palette.ts:146-149`). Adjacent to [#1755](https://github.com/eclipse-glsp/glsp/issues/1755).
- `ApplyMarkersCommand` appends to `issueMarker.issues` on a root it mutates in place, so it is correct only because each replay lands on a fresh root (`features/validation/validate.ts:146-160`).
- `DelKeyDeleteTool` implements `Tool` by hand against `KeyTool` while its file-neighbour `MouseDeleteTool` extends `BaseEditTool`: two registration idioms in one file (`features/tools/deletion/delete-tool.ts:38-57` vs `:82-97`).
- `KeyboardToolPalette` extends `ToolPalette` without overriding `id()`, and both are bound as `TYPES.IUIExtension` with handlers for the same action kinds: loading both modules yields two extensions answering to `'tool-palette'` (`features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:79` + its module at `:41`, vs `features/tool-palette/tool-palette-module.ts:23`). Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
- `SetEdgeTargetSelectionAction.is` tests `hasObjectProp(object, 'context')` while the interface declares `context: string` and `create` sets a string: so the guard can never hold and the handler wired for that kind is dead (`features/accessibility/edge-autocomplete/action.ts:18-33`, `features/accessibility/keyboard/keyboard-module.ts:68`). Live defect.
- `LeftToRightTopToBottomElementNavigator` is bound nowhere (`features/accessibility/element-navigation/left-right-top-bottom-navigator.ts:24` vs `element-navigation-module.ts:36-37`).
- ALT+N is advertised as "local mode" but selects the `PositionNavigator`, and N is advertised as "global mode" but selects the `LocalElementNavigator` (`features/accessibility/element-navigation/diagram-navigation-tool.ts:66,72,152,189`).
- Toast channels are keyed by `Symbol.for(ClassName)`, which is minification-fragile, and three unrelated components share one slot (`features/accessibility/view-key-tools/grid-cell-zoom-key-tool.ts:96`, `keyboard-tool-palette.ts:250`).
- Uncancelled `setTimeout`s in the toast tool, so two messages with the same id share one expiry (`features/accessibility/toast/toast-tool.ts:53,59`).
- `KeyboardGrid` overrides `setContainerVisible` to use its own CSS classes, leaving the inherited `isContainerVisible()` permanently `true` (`features/accessibility/keyboard-grid/keyboard-grid.ts:97` vs `base/ui-extension/ui-extension.ts:105-115`).
- `ElementNavigatorTool` never resets its key listener's `mode`/`previousNode`/`navigator` on disable, and `LocalElementNavigator` leaves its `navigable-element` CSS on the model (`diagram-navigation-tool.ts:57,89-91`; `local-element-navigator.ts:84-87`).
- Un-awaited, un-caught promises at `features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:121`, `features/accessibility/edge-autocomplete/edge-autocomplete-palette.ts:103`, `features/context-menu/glsp-context-menu-mouse-listener.ts:49`, `features/source-model-watcher/source-model-changed-action-handler.ts:~78`.
- `GridManager` and `DebugManager` create a `FeedbackEmitter` in `postConstruct` but declare no `preDestroy` (`features/grid/grid-manager.ts:56-59`, `features/debug/debug-manager.ts:34-37`).
- `ModelChangeService` subscribes to `commandStack.onCommandExecuted` without pushing the subscription onto its own `toDispose` (`base/model/model-change-service.ts:95`).
- `GLSPCommandStack.undo()`'s warning is unreachable via the dispatcher: `GLSPActionDispatcher.handleAction` overrides Sprotty's undo/redo branch entirely, so `UndoAction` goes to the model source (`base/action-dispatcher.ts:131-133`). Adjacent to [PROT-14](protocol.md).
- The licence header of `base/mouse-position-tracker.ts` has a stray `rank: number;` spliced into it at line 6, in the middle of the EPL URL block; `pnpm headers:check` does not catch it. A live defect; see the [tooling appendix](tooling.md#appendix-candidate-issues) for the check gap.

### DI, modules and structure

- Contribution ordering is expressed as unscoped magic numbers relative to `Ranked.DEFAULT_RANK`: `-200` (`base/mouse-position-tracker.ts:24`), `-100` (`base/tool-manager/tool-manager.ts:118-120`, `features/select/select-mouse-listener.ts:29`), `-10` (`features/hints/type-hint-provider.ts:82`), with no registry of who occupies which band.
- `DiagramLoader.load` sorts `this.diagramStartups` in place (`base/model/diagram-loader.ts:177`), mutating the array cached inside `DefaultLazyInjector`.
- `@multiInject(TYPES.IDiagramExporter)` at `features/export/diagram-export-postprocessor.ts:40` omits `@optional()`, so removing the default exporters makes the postprocessor unresolvable.
- `TYPES.IEditorContextServiceProvider` and `TYPES.ActionHandlerRegistryProvider` are marked deprecated (`packages/client/glsp-sprotty/src/types.ts:31-35`) yet still bound (`base/default.module.ts:80`) and still injected (`base/action-dispatcher.ts:51`). Adjacent to [#1747](https://github.com/eclipse-glsp/glsp/issues/1747).
- `initializeContainer` (`packages/common/protocol/src/di/container-configuration.ts:31`) collides by name with `GLSPAbstractUIExtension.initializeContainer(HTMLElement)` (`base/ui-extension/ui-extension.ts:93`).
- A 4-module cycle across the client's most complex feature area: `features/tools/change-bounds/change-bounds-manager.ts:50` → `features/helper-lines/helper-line-manager.ts:35` → `features/tools/change-bounds/change-bounds-tool-feedback.ts:23` → back; plus `change-bounds-tool.ts:68` ↔ `change-bounds-tool-move-feedback.ts:42`.
- `packages/client/client/src/index.ts` is a single flat 247-line barrel with no subpath entry points, so any consumer loads the whole client graph including all CSS side-effect imports. Adjacent to [#1341](https://github.com/eclipse-glsp/glsp/issues/1341): that issue owns the per-module CSS import; the barrel and entry-point shape is the other half of it. See [TOOL-2](tooling.md).
- `features/test/layouter-test-util.ts:33` imports `../../default-modules`, so a test helper inside `src/` pulls the entire 270-module client graph; it is excluded from the barrel and from the published `files`, but is still compiled by `tsc -b`.
- `@eclipse-glsp/sprotty` declares `sprotty-protocol`, `vscode-jsonrpc` and `autocompleter` as runtime dependencies but imports none of them from `src/`: and `sprotty-protocol` is simultaneously lint-forbidden there (`oxlint.config.mts:133-144`).
