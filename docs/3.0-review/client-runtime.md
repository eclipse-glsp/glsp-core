# A6 — Client runtime model

Surface swept: `packages/client/client/src/base/**`, `features/tools/**`, `features/change-bounds/**`,
`features/bounds/**`, `features/select`, `features/hover`, `features/viewport`, `features/helper-lines`,
`features/grid`, `features/hints`, `features/validation`, `features/copy-paste`, `features/tool-palette`,
`features/accessibility/**`, and `default-modules.ts`. Paths below are relative to `packages/client/client/src/`.

This lens looks at runtime mechanics — ownership of state, ordering, async boundaries, disposal — rather than the
exported type surface, which is [api-client.md](api-client.md).

Every finding below was verified against the source.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A6-1 · Mouse dispatch serializes rank groups across `await`, so `preventDefault` is dead and one failure silences the rest

- **Location:** `base/view/mouse-tool.ts:74`, `:77-85`, `:87-106`
- **What's wrong:** `handleEvent` calls `notifyListenersByRank` without awaiting, and that method awaits each rank group's action dispatch before invoking the next — so every listener above rank 0 runs in a later microtask, its `event.preventDefault()` (`:94`) no longer reaches the browser, a rejected dispatch in rank 0 aborts all remaining ranks as an unhandled rejection, and promise-returning listener results take a completely different, un-awaited and un-caught path (`:100-102`) from synchronous ones.
- **Direction:** Decide whether mouse listeners are synchronous collectors — gather all actions across all ranks, `preventDefault` once, then dispatch — or genuinely ordered async steps, and make the contract one of the two.
- **Size:** M

### A6-2 · Keyboard input has no arbitration mechanism; precedence is hand-coded in each listener

- **Location:** `base/view/key-tool.ts:29-36` (adds lazy registration only, no rank) · `features/viewport/viewport-key-listener.ts:41,80` · `features/change-bounds/move-element-key-listener.ts:41` · `features/change-bounds/resize/resize-tool.ts:40`
- **What's wrong:** `GLSPMouseTool` gained a rank model and `GLSPKeyTool` did not — Sprotty's `KeyTool` concatenates the actions of _all_ key listeners and dispatches them all, so the arrow-key conflict between `MoveViewportKeyListener` and `MoveElementKeyListener` (and the `+`/`-` conflict between `ZoomKeyListener` and `ResizeKeyListener`) is resolved by each listener independently checking `selectedElementIds.length === 0`. Every listener hard-codes its rival's precedence rule.
- **Direction:** Give key listeners the same rank/consumption model the mouse tool has, or introduce a keybinding registry that resolves a keystroke to one handler before any listener runs.
- **Size:** M
- **See also:** [api-client.md](api-client.md) A1-15 — the same asymmetry seen as a contribution-point API problem.

### A6-3 · Escape and the arrow keys are claimed by half a dozen listeners with no owner

- **Location:** `base/tool-manager/tool-manager.ts:195` · `features/accessibility/global-keylistener-tool.ts:89` · `features/accessibility/view-key-tools/deselect-key-tool.ts:82` · `features/accessibility/element-navigation/diagram-navigation-tool.ts:273` · `features/accessibility/keyboard-grid/keyboard-grid.ts:163` · `features/accessibility/keyboard-pointer/keyboard-pointer-listener.ts:106` · `features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:460`
- **What's wrong:** At least seven independently registered listeners react to `Escape` and all of them fire on every press, with ordering determined by whatever `KeyTool` registration order DI happened to produce; arrow keys are claimed three times over within a single activation (`keyboard-pointer-listener.ts:115`, `diagram-navigation-tool.ts:282`, `keyboard-tool-palette.ts:365`).
- **Direction:** One "cancel current interaction" concept that a single component owns, with everything else subscribing rather than binding the key.
- **Size:** M

### A6-4 · Tool activation is binary: enabling any tool disables every default tool

- **Location:** `base/tool-manager/tool-manager.ts:144-156`, `:130-134` · consumers at `features/tools/base-tools.ts:111`, `features/accessibility/element-navigation/diagram-navigation-tool.ts:146`
- **What's wrong:** `enable(toolIds)` unconditionally calls `disableActiveTools()` first, so triggering node creation also kills `ViewportKeyTool` (keyboard pan/zoom), `DirectLabelEditTool`, `DelKeyDeleteTool`, `MarqueeTool` and `EdgeEditTool` — capabilities unrelated to the mouse gesture being started — and there is no notion of a tool's _input scope_ from which to make that decision.
- **Direction:** Model what a tool claims (pointer gestures / a keystroke set / nothing) and disable only tools whose claim conflicts.
- **Size:** L

### A6-5 · Cross-component coordination is done by sniffing the action stream for hardcoded tool IDs

- **Location:** `features/viewport/glsp-scroll-mouse-listener.ts:26-32` · `features/hover/hover.ts:58-62` · `features/helper-lines/helper-line-manager.ts:137-147`
- **What's wrong:** `GLSPScrollMouseListener` and `GlspHoverMouseListener` each watch for `EnableToolsAction` and compare `toolIds` against a hardcoded `MarqueeMouseTool.ID` / `EdgeCreationTool.ID` to flip a private flag, and `HelperLineManager` infers move state by matching `MoveAction`/`SetBoundsAction` kinds — none of which sees anything if a tool is enabled through `IToolManager.enable()` directly. `GLSPScrollMouseListener` additionally never resets `preventScrolling` when a _different_ tool is enabled (`:26-32` resets only on `EnableDefaultToolsAction`), so scrolling stays dead.
- **Direction:** An explicit interaction-state service — active tool, in-progress gesture — that components query, instead of each reverse-engineering it from the action stream.
- **Size:** M
- **Adjacent to:** [#1471](https://github.com/eclipse-glsp/glsp/issues/1471) — that issue owns the one symptom; this is the mechanism behind it.

### A6-6 · Keyboard move and resize are a second, independent implementation of change-bounds

- **Location:** `features/change-bounds/move-element-handler.ts:115-135` and `features/change-bounds/resize/resize-handler.ts:101-114` vs `features/tools/change-bounds/change-bounds-tracker.ts:199-274` and `features/tools/change-bounds/change-bounds-manager.ts:202-263`
- **What's wrong:** `MoveElementHandler.getTargetBounds` re-implements snapping and move validation against `ISnapper`/`IMovementRestrictor` directly, bypassing `ChangeBoundsTracker`, `IChangeBoundsManager`, the helper-line manager, the grid manager and the container manager that the mouse path goes through — so a keyboard move and a mouse move of the same element obey different rules, and `ResizeElementHandler` even fabricates a cast model element to reach `toElementAndBounds` (`resize-handler.ts:136`).
- **Direction:** Route keyboard move/resize through the same tracker and manager as the pointer path, leaving the handlers as thin adapters from keystroke to tracked movement.
- **Size:** M
- **Adjacent to:** [#1749](https://github.com/eclipse-glsp/glsp/issues/1749) — the split should land on one implementation, not two.

### A6-7 · Readonly is a convention applied ad hoc, not an enforced invariant

- **Location:** `base/tool-manager/tool-manager.ts:147` · `features/copy-paste/copy-paste-handler.ts:124-141` · `features/copy-paste/copy-paste-standalone.ts:43-64` · contrast `features/copy-paste/copy-paste-context-menu.ts:97` · scattered guards at `features/tool-palette/tool-palette.ts:411,421,513,539`
- **What's wrong:** The only systematic enforcement is `ToolManager.enable` filtering `isEditTool`, so anything that is not a `Tool` escapes it — `ServerCopyPasteHandler.handleCut`/`handlePaste` send `CutOperation`/`PasteOperation` with no readonly check, from `window` listeners that `CopyPasteStartup` registers unconditionally at `postModelInitialization`, while the _context-menu_ path for the same operations does check.
- **Direction:** Make readonly a gate on the dispatch path — reject `Operation`s when readonly — so it holds regardless of entry point, and keep the per-tool filter as a UX affordance only.
- **Size:** M

### A6-8 · `initializeDiagramContainer` ships without a counterpart, so every `@preDestroy` in the client is unreachable

- **Location:** `default-modules.ts:174-186` · the 16 `@preDestroy` disposals, e.g. `base/editor-context-service.ts:164`, `base/selection-service.ts:96`, `base/command-stack.ts:49`, `base/feedback/feedback-action-dispatcher.ts:186`, `base/model/glsp-model-source.ts:253`, `features/copy-paste/copy-paste-standalone.ts:75`
- **What's wrong:** Nothing in this repository — not the standalone example, not the e2e suites — ever calls `container.unbindAll()` or `unload()` (verified: zero occurrences across `packages/client`, `examples` and `e2e`), and the package exports no dispose API. The careful `DisposableCollection` + `@preDestroy` wiring never runs, including the path at `glsp-model-source.ts:253` that calls `glspClient.disposeClientSession(...)` — so closing a diagram leaves a live server session behind, and per-diagram lifecycle is effectively "create and leak".
- **Direction:** Export a `disposeDiagramContainer` counterpart — an `IDiagramShutdown` to match `IDiagramStartup` — drive it from the standalone example, and make per-diagram teardown a tested path rather than an assumption about what integrations do.
- **Size:** M

### A6-9 · Tools install document-level listeners in `enable()` that can never be removed

- **Location:** `features/accessibility/global-keylistener-tool.ts:41-43,45` · `features/accessibility/focus-tracker/focus-tracker-tool.ts:41-51` · contrast `features/accessibility/element-navigation/diagram-navigation-tool.ts:60`
- **What's wrong:** `GlobalKeyListenerTool` registers `document.addEventListener('keyup', this.trigger.bind(this))` behind an `alreadyRegistered` latch without storing the bound function, so it is unremovable by construction and keeps dispatching into a torn-down diagram; `FocusTrackerTool` does the same with `focusin`/`focusout` and states in a comment at `:50` that it "cannot be disabled after enabling it" — a `TYPES.IDefaultTool` that structurally violates `Tool.disable()`. Both also discard the `Disposable` that `repeatOnMessagesUpdated` returns.
- **Direction:** Make `enable()` return or accumulate disposables as the only legal way to register anything, and drop the latch-flag idiom; a tool that cannot be disabled is not a tool.
- **Size:** S

### A6-10 · Diagram loading can hang forever, and every startup-hook failure is swallowed

- **Location:** `base/model/diagram-loader.ts:199`, `:203-211` · `base/model/model-initialization-constraint.ts:118-125` · `features/viewport/viewport-handler.ts:68-98`
- **What's wrong:** `load()` awaits `modelInitializationConstraint.onInitialized()` with no timeout, and `DefaultModelInitializationConstraint` completes only on an `InitializeCanvasBoundsAction` arriving _after_ a non-empty model action. Meanwhile `invokeStartupHook` catches every hook error, `console.error`s it and continues as if nothing happened — and one such hook, `RestoreViewportHandler.postRequestModel`, awaits a `MutationObserver` on `document.body` that is never disconnected if the selector never matches.
- **Direction:** Give initialization a deadline and a failure state the diagram can render, and let a startup hook declare whether its failure is fatal instead of the loader deciding for it.
- **Size:** M

### A6-11 · Type hints are applied by mutating shared feature sets and monkey-patching model methods on every update

- **Location:** `features/hints/type-hint-provider.ts:92-134`, `:166-172` · Sprotty's per-registration `featureSet` at `sprotty/lib/base/model/smodel-factory.js:46-57`
- **What's wrong:** `ApplyTypeHintsCommand` is a `FeedbackCommand` replayed on every model update; it walks the entire index and calls `addOrRemove(element.features, …)` — but Sprotty creates one `featureSet` per _registration_ and assigns the same object to every instance of that type, so this mutates globally shared state — then assigns closures over `element.canConnect` and `element.isContainableElement`. What a user may move, resize, delete or connect therefore depends on whether the type-hints feedback has been replayed yet, and is carried by patched instance methods rather than by the model type.
- **Direction:** Make type hints a queryable service the tools consult (`canMove(element)`, `canConnect(edge, source, role)`) instead of a command that rewrites model instances.
- **Size:** L
- **Adjacent to:** [#1755](https://github.com/eclipse-glsp/glsp/issues/1755) — that issue owns the cost of type-hint replay; this is the design that causes it. See also [api-client.md](api-client.md) A1-5 for the API-contract half.

### A6-12 · Feedback commands execute under a second, unstated contract

- **Location:** `base/feedback/feedback-action-dispatcher.ts:153-159` · `features/bounds/set-bounds-feedback-command.ts:56-71` · `features/element-template/add-template-element.ts:68-78` · `features/bounds/local-bounds.ts:54-67`
- **What's wrong:** `applyFeedbackCommands` calls `command.execute(context)` directly and discards the return value, so the `CommandResult` contract (`modelChanged`, a replacement root, `cause`) that holds on the dispatch path silently does not hold on the replay path — a feedback command must mutate `context.root` in place or have no effect. Several feedback commands additionally dispatch _new_ actions from inside `execute` (`LocalRequestBoundsAction.fromCommand`), so every model update re-triggers a hidden-bounds round trip from inside command execution.
- **Direction:** Either make replay honour the same contract as dispatch, or split feedback into a distinct "decorator" type that is explicitly in-place and side-effect-free, so the two are not the same class.
- **Size:** M
- **Adjacent to:** [#1750](https://github.com/eclipse-glsp/glsp/issues/1750) — that issue owns the emitter API; this is the command-side contract underneath it.

### A6-13 · The `ServerAction` marker doubles as a "do not forward" flag, and is set by lying

- **Location:** `base/model/glsp-model-source.ts:42-58`, `:235-237` · `features/bounds/local-bounds.ts:70-80`, `:42`
- **What's wrong:** Whether an action goes to the server is decided by a hidden mutable property stamped onto the action object (`__receivedFromServer`), and `LocalComputedBoundsAction.mark` sets it on a _client-produced_ action with the comment "mimic: we mark the computed bounds action as coming from the server so it is not sent to the server" — so one boolean carries two contradictory meanings, and `LocalRequestBoundsAction.is` has to test for its absence to distinguish a local bounds request from a server one.
- **Direction:** Make the routing decision explicit at dispatch (`dispatchLocal`, or a per-action-kind destination in the handler registry) rather than a mutated marker on the payload.
- **Size:** M
- **See also:** [protocol.md](protocol.md) A4-4 — the same marker mechanism seen from the wire side.

### A6-14 · Actions received from the server are dispatched without `await` or `catch`

- **Location:** `base/model/glsp-model-source.ts:166-178` · contrast the request branch directly below at `:181-198`
- **What's wrong:** `messageReceived` ends in a bare `this.actionDispatcher.dispatch(action)`, so any handler that throws — including the deliberate `Missing handler for action` throw at `base/action-dispatcher.ts:177` — becomes an unhandled promise rejection with no user-visible effect and no path back to the server. The request branch immediately below does exactly the right thing, which shows the asymmetry is unintentional.
- **Direction:** Route server-pushed actions through the same failure handling as server requests, with one place deciding what a client-side handling failure means.
- **Size:** S
- **Adjacent to:** [#1753](https://github.com/eclipse-glsp/glsp/issues/1753) / [#1632](https://github.com/eclipse-glsp/glsp/issues/1632) — those own the wire format; this is a local missing `catch`.

### A6-15 · `dispose()` is overloaded as "reset state" on mouse listeners, so tool state has no defined lifetime

- **Location:** `features/tools/change-bounds/change-bounds-tool.ts:388,406-409` · `features/tools/change-bounds/change-bounds-tool-move-feedback.ts:221,226` · `features/tools/edge-edit/edge-edit-tool.ts:219,305` · the asymmetry at `edge-edit-tool.ts:95-101`
- **What's wrong:** `ChangeBoundsListener.selectionChanged` calls `this.dispose()`, `FeedbackMoveMouseListener.draggingMouseUp` calls `this.dispose()`, and `EdgeEditListener.mouseDown` calls `this.dispose()` then immediately re-registers listeners — in every case the object stays registered on the mouse tool and is used again. So `dispose` means "reset" here and "tear down" when the same object is pushed onto `toDisposeOnDisable` (`change-bounds-tool.ts:111`). The same overload hides a bug: `EdgeEditTool.deregisterFeedbackListeners` disposes the source and target listeners but not `feedbackMovingListener`.
- **Direction:** Separate `reset()` (end of one interaction) from `dispose()` (end of the listener's life), and let `DisposableCollection` mean only the latter.
- **Size:** S

### A6-16 · Drag state lives per-listener with no pointer capture; recovery is an ad-hoc re-entry hack

- **Location:** `base/drag-aware-mouse-listener.ts:38-75` · `features/tools/change-bounds/change-bounds-tool-move-feedback.ts:70-83`
- **What's wrong:** Each `DragAwareMouseListener` tracks `_isMouseDown`/`_isMouseDrag` from SVG-scoped events only, so releasing the button outside the diagram never delivers `mouseUp` and leaves every such listener stuck mid-drag. `FeedbackMoveMouseListener` works around exactly this by calling `draggingMouseUp` from inside `mouseDown` when it finds itself still tracking (`:73-77`, with a comment naming the cause), while `ChangeBoundsListener` has no such recovery at all.
- **Direction:** One gesture owner using pointer capture (`setPointerCapture`, or a window-level `pointerup`) that begins and ends a drag for all participants, instead of N listeners each reconstructing it.
- **Size:** M

---

## Appendix — remaining observations

- Multiple handlers for one action kind are invoked "in one burst" without awaiting between them, and each may set the shared `blockUntil` — so effect ordering is promise-settle order and the last command's block predicate wins (`base/action-dispatcher.ts:180-207`).
- `IToolManager.enable` documents a fallback to the default tools when no tool matches, but the implementation silently leaves _no_ tool active for an unknown id (`base/tool-manager/tool-manager.ts:56-66` vs `:144-156`).
- `FocusTracker` is bound as `TYPES.IDiagramStartup` but implements no startup hook — a dead binding (`base/default.module.ts:90`).
- `ToolPalette` declares `implements IEditModeListener` but is never bound to `TYPES.IEditModeListener`; it subscribes manually in `postConstruct` instead (`features/tool-palette/tool-palette.ts:70,110`, `tool-palette-module.ts:21-28`).
- Three parallel ways to become a selection listener: the `TYPES.ISelectionListener` multibinding (`base/selection-service.ts:87`), `selectionService.addListener` from `postConstruct` with the disposable discarded (`features/helper-lines/helper-line-manager.ts:134`), and the raw `onSelectionChanged` event.
- `FeedbackMoveMouseListener.moveInitializationTimeout()` is an overridable hook nothing calls — the 750 ms is hardcoded three lines above it (`features/tools/change-bounds/change-bounds-tool-move-feedback.ts:101-110`).
- `GLSPHiddenBoundsUpdater` reaches into a Sprotty private field by string index to get the bounds map (`features/bounds/glsp-hidden-bounds-updater.ts:73-75`).
- `ChangeBoundsTracker.calculateElementBounds` mutates its `handleMove.moveVector` argument in place, and that same object is then used for CSS feedback (`features/tools/change-bounds/change-bounds-tracker.ts:361,365-366`).
- `startTracking()` silently no-ops when `MousePositionTracker` has no last position, so `isTracking()` is false and the whole move is dropped without a log (`features/change-bounds/tracker.ts:48-53`, `change-bounds-tracker.ts:176-188`).
- Model elements are mutated outside any command: `element.position` from a mouse listener (`features/element-template/mouse-tracking-element-position-listener.ts:98`) and `element.bounds` from the edge router during rendering (`features/routing/edge-router.ts:125`).
- `MarqueeMouseListener` caches the markable node/edge list from the root at construction time, so it works against a stale model if an update arrives while the marquee is active (`features/tools/marquee-selection/marquee-mouse-tool.ts:64-66`).
- `MarqueeKeyListener` switches tools on _any_ keydown while Shift is held, not on a Shift keystroke (`features/tools/marquee-selection/marquee-tool.ts:49-54`).
- `EdgeCreationToolMouseListener.canConnect` fires a server request from a synchronous mouse listener and dispatches the late result without checking whether the tool was disabled meanwhile; `dispose()` does not clear `pendingDynamicCheck` (`features/tools/edge-creation/edge-creation-tool.ts:219-234,241-249`). Adjacent to [#1470](https://github.com/eclipse-glsp/glsp/issues/1470).
- `NodeCreationToolMouseListener.cursorFeedback` and `EdgeCreationToolMouseListener.cursorFeedback` are constructed and disposed but never written to — dead emitters (`node-creation-tool.ts:132`, `edge-creation-tool.ts:109`).
- `SearchAutocompletePalette.deleteAllCSS` builds one action per element in the whole index and dispatches them all (`features/search-palette/search-palette.ts:146-149`). Adjacent to [#1755](https://github.com/eclipse-glsp/glsp/issues/1755).
- `ApplyMarkersCommand` appends to `issueMarker.issues` on a root it mutates in place, so it is correct only because each replay lands on a fresh root (`features/validation/validate.ts:146-160`).
- `DelKeyDeleteTool` implements `Tool` by hand against `KeyTool` while its file-neighbour `MouseDeleteTool` extends `BaseEditTool` — two registration idioms in one file (`features/tools/deletion/delete-tool.ts:38-57` vs `:82-97`).
- `KeyboardToolPalette` extends `ToolPalette` without overriding `id()`, and both are bound as `TYPES.IUIExtension` with handlers for the same action kinds — loading both modules yields two extensions answering to `'tool-palette'` (`features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:79` + its module at `:41`, vs `features/tool-palette/tool-palette-module.ts:23`). Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
- `SetEdgeTargetSelectionAction.is` tests `hasObjectProp(object, 'context')` while the interface declares `context: string` and `create` sets a string — so the guard can never hold and the handler wired for that kind is dead (`features/accessibility/edge-autocomplete/action.ts:18-33`, `features/accessibility/keyboard/keyboard-module.ts:68`). Live defect.
- `LeftToRightTopToBottomElementNavigator` is bound nowhere (`features/accessibility/element-navigation/left-right-top-bottom-navigator.ts:24` vs `element-navigation-module.ts:36-37`).
- ALT+N is advertised as "local mode" but selects the `PositionNavigator`, and N is advertised as "global mode" but selects the `LocalElementNavigator` (`features/accessibility/element-navigation/diagram-navigation-tool.ts:66,72,152,189`).
- Toast channels are keyed by `Symbol.for(ClassName)`, which is minification-fragile, and three unrelated components share one slot (`features/accessibility/view-key-tools/grid-cell-zoom-key-tool.ts:96`, `keyboard-tool-palette.ts:250`).
- Uncancelled `setTimeout`s in the toast tool, so two messages with the same id share one expiry (`features/accessibility/toast/toast-tool.ts:53,59`).
- `KeyboardGrid` overrides `setContainerVisible` to use its own CSS classes, leaving the inherited `isContainerVisible()` permanently `true` (`features/accessibility/keyboard-grid/keyboard-grid.ts:97` vs `base/ui-extension/ui-extension.ts:105-115`).
- `ElementNavigatorTool` never resets its key listener's `mode`/`previousNode`/`navigator` on disable, and `LocalElementNavigator` leaves its `navigable-element` CSS on the model (`diagram-navigation-tool.ts:57,89-91`; `local-element-navigator.ts:84-87`).
- Un-awaited, un-caught promises at `features/accessibility/keyboard-tool-palette/keyboard-tool-palette.ts:121`, `features/accessibility/edge-autocomplete/edge-autocomplete-palette.ts:103`, `features/context-menu/glsp-context-menu-mouse-listener.ts:49`, `features/source-model-watcher/source-model-changed-action-handler.ts:~78`.
- `GridManager` and `DebugManager` create a `FeedbackEmitter` in `postConstruct` but declare no `preDestroy` (`features/grid/grid-manager.ts:56-59`, `features/debug/debug-manager.ts:34-37`).
- `ModelChangeService` subscribes to `commandStack.onCommandExecuted` without pushing the subscription onto its own `toDispose` (`base/model/model-change-service.ts:95`).
- `GLSPCommandStack.undo()`'s warning is unreachable via the dispatcher: `GLSPActionDispatcher.handleAction` overrides Sprotty's undo/redo branch entirely, so `UndoAction` goes to the model source (`base/action-dispatcher.ts:131-133`). Adjacent to [protocol.md](protocol.md) A4-14.
- The licence header of `base/mouse-position-tracker.ts` has a stray `rank: number;` spliced into it at line 6, in the middle of the EPL URL block; `pnpm headers:check` does not catch it. Live defect.
