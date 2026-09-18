# A1 — Public API surface & extension points: client

Surface swept: `packages/client/client/src` (270 files, ~27.5k LOC) and `packages/client/glsp-sprotty/src` (8 files).

Every finding below was verified against the source. Several are live defects rather than design questions; that is
stated in the finding.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A1-1 · `@eclipse-glsp/client` re-exports the whole of Sprotty as its own public API

- **Location:** `packages/client/client/src/re-exports.ts:16` (`export * from '@eclipse-glsp/sprotty'`) fanning out to `packages/client/glsp-sprotty/src/re-exports.ts:20-312` — `export * from '@eclipse-glsp/protocol'` plus ~120 deep `sprotty/lib/...` paths, including `sprotty/lib/utils/inversify`, `sprotty/lib/lib/jsx` and `sprotty/lib/base/views/viewer-cache`
- **What's wrong:** Everything Sprotty exports is `@eclipse-glsp/client` public API, so a Sprotty patch release can change GLSP's API surface, and nothing distinguishes a GLSP contract from a transitively leaked Sprotty internal — there is not one `@internal` marker in either package.
- **Direction:** A curated, explicitly listed façade, or a separate `@eclipse-glsp/client/sprotty` entry point, so the seam is visible and Sprotty's surface stops being GLSP's compatibility promise.
- **Size:** L

### A1-2 · `TYPES.IContextMenuProvider` is a shadow symbol that silently disables the marker-navigator menu

- **Location:** `packages/client/glsp-sprotty/src/types.ts:45` (`IContextMenuProvider: Symbol('IContextMenuProvider')`) vs Sprotty's `TYPES.IContextMenuItemProvider` = `Symbol.for('IContextMenuProvider')` — same description, different symbol · bound at `packages/client/client/src/features/validation/validation-modules.ts:55` · every other provider uses the correct one (`features/context-menu/context-menu-module.ts:33`, `examples/workflow-glsp/src/workflow-diagram-module.ts:66`)
- **What's wrong:** Two service identifiers with identical descriptions coexist in the same exported `TYPES` object, and `MarkerNavigatorContextMenuItemProvider` is bound to the one no registry consumes — so the "go to next/previous marker" entries never appear. This is a live defect.
- **Direction:** Delete the shadow symbol — its single usage is the bug — and let `TYPES` spread Sprotty's identifiers without redefining any.
- **Size:** S

### A1-3 · A container built by `initializeDiagramContainer` cannot render anything

- **Location:** `packages/client/client/src/default-modules.ts:67-108` (`DEFAULT_MODULES`, 38 modules, no view bindings) vs `packages/client/client/src/views/base-view-module.ts:56-97` · `baseViewModule` is exported from the barrel (`index.ts:252`) and referenced nowhere in the workspace, while `configureDefaultModelElements` is called by hand at `examples/workflow-glsp/src/workflow-diagram-module.ts:68`
- **What's wrong:** The mandatory step that registers `GGraph`/`GNode`/`GEdge`/`GLabel` and their views is a free function the adopter must know to call, and the module that wraps it is dead code.
- **Direction:** Either put `baseViewModule` into `DEFAULT_MODULES` or delete it and document `configureDefaultModelElements` as the one required call — today the API ships both and uses neither.
- **Size:** S

### A1-4 · `configureActionHandler` cannot relate an action kind to the handler that claims it

- **Location:** `packages/client/glsp-sprotty/src/action-handler-override.ts:68-74` (`kind: string`, `constr: ServiceIdentifier<IActionHandler>`) · narrowing handlers at `features/grid/grid-manager.ts:61`, `features/debug/debug-manager.ts:53`, `features/hints/type-hint-provider.ts:217`, `features/status/status-overlay.ts:106`, `features/validation/validate.ts:98`
- **What's wrong:** Handlers routinely narrow `IActionHandler.handle(action: Action)` to one concrete action type — legal under method bivariance — while the binding API accepts any `string` kind, so a wrong or duplicated `configureActionHandler` call compiles cleanly and fails at dispatch time.
- **Direction:** A generic `configureActionHandler<A extends Action>(context, kind: A['kind'], handler: ServiceIdentifier<IActionHandler<A>>)`, with `IActionHandler` parameterised on the action it handles.
- **Size:** M

### A1-5 · Type hints are applied by monkey-patching methods onto live model instances

- **Location:** `packages/client/client/src/features/hints/type-hint-provider.ts:123` (`element.isContainableElement = input => …`) and `:126-130` (`element.canConnect = …`, capturing the adopter's own implementation as `fallbackCanConnect` and using it only when no edge hint matches)
- **What's wrong:** An adopter who implements `Containable.isContainableElement` or `Connectable.canConnect` on their own model class has it silently replaced on every model update, and neither interface says so.
- **Direction:** Keep hint lookup in the provider and have `Containable`/`Connectable` implementations consult `ITypeHintProvider` explicitly, so overriding stays an ordinary method override.
- **Size:** M

### A1-6 · Tools wire their listeners with positional constructors and hand out `this` as a concrete class

- **Location:** `features/tools/edge-creation/edge-creation-tool.ts:73-79` (5 positional args; `this` typed `EdgeCreationTool` at `:103`) · `features/tools/change-bounds/change-bounds-tool.ts:152-162` with `ChangeBoundsListener` at `:178` · `features/tools/edge-edit/edge-edit-tool.ts:72-77` with `EdgeEditListener` at `:118` · `features/tools/node-creation/node-creation-tool.ts:88` — contrasted with `:97-105`, where the sibling `NodeInsertTrackingListener` correctly depends on the `ContainerPositioningTool` _interface_
- **What's wrong:** Replacing a listener means overriding a `protected create*()` factory and reproducing an undocumented positional argument list, and the listener is reusable only with the exact concrete tool class it was written against — except in the one place that got it right.
- **Direction:** Narrow tool→listener coupling to the capability interfaces that already exist (`FeedbackAwareTool`, `PositioningTool`, `ContainerPositioningTool`) and pass a single options object.
- **Size:** M
- **Adjacent to:** [#1749](https://github.com/eclipse-glsp/glsp/issues/1749) — that issue splits `ChangeBoundsTool`; this is the coupling pattern shared by all four tools.

### A1-7 · `IChangeBoundsManager` is a 14-member interface whose type signatures erase themselves

- **Location:** `features/tools/change-bounds/change-bounds-manager.ts:58-178` · `usePositionSnap(arg: MouseEvent | KeyboardEvent | any)` at `:70`, `useMovementRestriction` at `:115`, `useSymmetricResize` at `:171` · implementations branch on `typeof arg === 'boolean'` at `:199`/`:323` · `createTracker()` at `:326-328` does `new ChangeBoundsTracker(this)`
- **What's wrong:** The one documented seam for move/resize policy takes parameters typed `any` — the `| any` collapses each union — whose real contract (`boolean | MouseEvent | KeyboardEvent`) is discoverable only by reading the body, and the tracker it produces is `new`-ed rather than resolved, so customizing it requires subclassing the manager.
- **Direction:** Declare the actual union, and resolve the tracker through a bound factory.
- **Size:** M

### A1-8 · `ExternalMarkerManager` is an extension point nothing binds, connects, or can implement without subclassing

- **Location:** `features/validation/validate.ts:68-84` · `connect(actionDispatcher)` at `:73` is called from nowhere in the repository · no module binds `ExternalMarkerManager` · its only consumer is the `@optional()` injection at `:91-93` · `languageLabel: string` at `:69` is never assigned
- **What's wrong:** Using it requires subclassing an `@injectable()` abstract class, binding it to itself, and calling `connect()` from somewhere — none of it discoverable, and skipping the third step makes `removeMarkers()` a permanent silent no-op.
- **Direction:** An `IExternalMarkerManager` interface behind a `TYPES` symbol with the dispatcher injected — the shape every other extension point in this package already has.
- **Size:** S

### A1-9 · `AutocompleteSuggestionRegistry` can only be implemented by extending a Sprotty class

- **Location:** `base/auto-complete/autocomplete-suggestion-provider.ts:64-66` — `export interface AutocompleteSuggestionRegistry extends InstanceRegistry<IAutocompleteSuggestionProvider>`, and `InstanceRegistry` declares `protected elements` / `protected missing`
- **What's wrong:** A `TYPES.IAutocompleteSuggestionProviderRegistry` binding that looks interface-based is in fact locked to one concrete Sprotty base class, and it inherits a `get()` that throws on a missing key.
- **Direction:** Declare the registry interface from its own members and let `DefaultAutocompleteSuggestionRegistry` keep `InstanceRegistry` as a private implementation detail.
- **Size:** S

### A1-10 · Empty marker interfaces make their type guards no-ops and let anything be a feedback key

- **Location:** `base/feedback/feedback-action-dispatcher.ts:35` (`export interface IFeedbackEmitter {}`) · `features/hints/model.ts:41-45` (`Reparentable {}` plus `isReparentable(): element is GModelElement & Reparentable`) · `features/reconnect/model.ts:31-35` (`Reconnectable {}`)
- **What's wrong:** `GModelElement & Reparentable` is structurally identical to `GModelElement`, so these guards narrow nothing; and `registerFeedback(feedbackEmitter: IFeedbackEmitter, …)` accepts any object at all — which is why the implementation needs a runtime `instanceof GModelElement` warning at `:109-115` to catch the mistake the type was meant to prevent.
- **Direction:** Give `IFeedbackEmitter` a real discriminant (a branded `readonly feedbackId: string`) and replace the empty feature interfaces with branded types.
- **Size:** S
- **Adjacent to:** [#1750](https://github.com/eclipse-glsp/glsp/issues/1750) — that issue reshapes the feedback lifecycle; this is the type that identifies a feedback owner.

### A1-11 · Five contribution points, five different override policies, none stated in the API

- **Location:** `features/export/diagram-export-postprocessor.ts:63-71` (`@multiInject`, first-bound-wins, policy documented only in a comment inside a protected method at `:64-67`) · `base/model/model-registry.ts:29-42` (last-wins, `console.log`, plus a deprecation `console.warn`) · `base/view/view-registry.ts:26-35` (last-wins, `console.log`) · `glsp-sprotty/src/layout-override.ts:44-53` (first-wins, `logger.warn`) · `glsp-sprotty/src/action-handler-override.ts:47-66` (all-wins, `MultiInstanceRegistry`)
- **What's wrong:** An adopter registering a second contribution for the same key gets silently-ignored, silently-replaced, loudly-replaced or additive behaviour depending on which registry they hit, and the only way to find out is to read each `register`.
- **Direction:** One `override`/`replace` convention across the contribution points, expressed in the registration API rather than in logging.
- **Size:** M

### A1-12 · The four GLSP edge routers are copy-paste, so an adopter's fifth router silently lacks the fixes

- **Location:** `features/routing/edge-router.ts:31-48`, `:53-70`, `:75-92`, `:97-114` — `getTranslatedAnchor` and `cleanupRoutingPoints` are byte-identical across `GLSPAbstractEdgeRouter`, `GLSPPolylineEdgeRouter`, `GLSPManhattanEdgeRouter` and `GLSPBezierEdgeRouter`, comments included
- **What's wrong:** The two safety behaviours GLSP adds on top of Sprotty's routers — invalid-anchor fallback and a bounds guard before cleanup — exist only as duplicated method bodies, so extending `AbstractEdgeRouter` or any Sprotty router directly gets you neither, and nothing in the API says they exist.
- **Direction:** Extract them into an exported mixin or helper pair that a custom router calls, documented as the contract for a GLSP router.
- **Size:** S

### A1-13 · `messages` is a process-global mutable object typed to accept anything

- **Location:** `base/messages.ts:20` (`WithDynamicProperties<T> = T & Record<string, any>`), `:47-51`, `:56` (`export const messages: Messages = rawMessages`), `:68-71` (`updateMessages` mutates in place and fires a global emitter)
- **What's wrong:** The doc at `:45` promises "type-safe access to the known messages" while the type intersects `Record<string, any>`, so `messages.typo.that.does.not.exist` compiles and yields `any`; and because it is a module singleton, two diagram containers on one page cannot have different message sets.
- **Direction:** Drop the `Record<string, any>` escape hatch — adopters extend via declaration merging — and make the message bundle a container-scoped service.
- **Size:** M
- **Adjacent to:** [#1752](https://github.com/eclipse-glsp/glsp/issues/1752).

### A1-14 · `EditorContextService.modelRoot` throws, making three documented fallbacks dead code

- **Location:** `base/editor-context-service.ts:241-246` (throws `'Model root not available yet'`, typed `Readonly<GModelRoot>`) · `:248-250` (`this.modelRoot ? … : undefined` — the `undefined` branch is unreachable) · `:261-264` (`this.modelRoot?.canvasBounds ?? Bounds.EMPTY`, with a comment explaining the default)
- **What's wrong:** `viewport` advertises `| undefined` and `canvasBounds` advertises an `EMPTY` default, but both throw before they can return either — so a consumer that guards on `undefined` is wrong, and one that does not is also wrong.
- **Direction:** Make `modelRoot` return `GModelRoot | undefined` (mirroring `IModelChangeService.currentRoot`, which already does) and add an explicit `requireModelRoot()` for the throwing variant.
- **Size:** S

### A1-15 · Listener ranking exists for mouse listeners and not for key listeners

- **Location:** `base/view/mouse-tool.ts:55,65` (rebuilds `rankedMouseListeners` via `Ranked.getRank`, dispatched in rank order at `:77-85`) vs `base/view/key-tool.ts:29-36`, where `GLSPKeyTool` only registers, with no rank bucket
- **What's wrong:** Two structurally identical contribution points — `TYPES.MouseListener` and `TYPES.KeyListener`, both collected in `preLoadDiagram` — have different ordering guarantees, so a key listener's position depends on module load order and cannot be influenced.
- **Direction:** Lift the rank grouping into a shared base, or drop it from both and give listeners an explicit registration priority.
- **Size:** S

---

## Appendix — remaining observations

- `base/tool-manager/tool.ts:50` — `EnableDefaultToolsAction.is` is declared `object is EnableToolsAction`; `tool-manager.ts:188` and `hover.ts:59` compensate with `action as EnableToolsAction` casts.
- `base/model/glsp-model-source.ts:69` — `OptionalAction.is` is declared `object is ServerAction`.
- `base/tool-manager/tool-manager.ts:136,158,162` — `tool()`, `disableEditTools()` and `enableDefaultTools(force)` are absent from or wider than `IToolManager` (`:43-79`), so `TYPES.IToolManager` consumers cannot reach them. Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `features/copy-paste/copy-paste-handler.ts:38` declares `put(data, id?: string)` while `LocalClipboardService.put` at `:68` requires `id: string`; calling through the interface without an id makes every later `get(someId)` return `undefined`.
- `features/accessibility/keyboard-pointer/keyboard-pointer.ts:32` — the framework defaults `elementTypeId` to `'task:automated'`, a Workflow-example type, in a published package.
- `features/accessibility/keyboard-pointer/keyboard-pointer.ts:38-39` — `@inject(TYPES.IContainerManager) containerManager: ContainerManager` declares the concrete class for an interface symbol; rebinding `IContainerManager` to a non-subclass type-checks and breaks only here.
- `base/feedback/update-model-command.ts:53` — `applyFeedbackCommands` returns a promise discarded inside a synchronous `performUpdate`, so async feedback commands race the model update. Adjacent to [#1750](https://github.com/eclipse-glsp/glsp/issues/1750).
- `features/tools/base-tools.ts:105-118` — `BaseCreationTool.isTriggerAction: (obj: any) => obj is T` uses `any`, and `triggerAction: T` is declared non-optional but is `undefined` until `handle()` fires, which `enable()` then reports as a `TypeError`.
- `features/change-bounds/snap.ts:20` — the deprecation points at `{@link ChangeBoundsManager.useSnap}`, which does not exist; the member is `usePositionSnap`. Adjacent to [#1747](https://github.com/eclipse-glsp/glsp/issues/1747).
- `features/element-template/mouse-tracking-element-position-listener.ts:39` — `PositioningTool extends FeedbackAwareTool`, whose `registerFeedback`/`deregisterFeedback` (`base-tools.ts:42,52`) are both `@deprecated`, so implementing a positioning tool means implementing two deprecated methods.
- `utils/argument-utils.ts:67` — `getArguments` filters with `if (value)`, dropping `0`, `false` and `''`; `getNumbers`/`getBooleans` therefore return short arrays and `CornerRadius.from` (`:118-128`) silently degrades a `radiusTopRight: 0` to a uniform radius. (Same truthiness bug shape as `ArgsUtil` on the server — see [api-server.md](api-server.md) appendix.)
- `base/auto-complete/auto-complete-widget.ts:90-110` — a 6-positional-argument constructor plus two side-channel `configure*` methods; the call site at `base/auto-complete/base-autocomplete-palette.ts:62-72` shows the cost.
- `base/auto-complete/auto-complete-widget.ts:47-49` — `InputValueInitializer` is exported public API referenced nowhere in the repository.
- `features/tools/edge-edit/edge-edit-tool.ts:89-101` — `registerFeedbackListeners()`/`deregisterFeedbackListeners()` are public but throw before `enable()` has run, and exist only so the listener can call back into its own tool.
- `features/tools/change-bounds/change-bounds-tool.ts:110-145` — factory return types (`MouseListener`, `KeyListener`) are narrower than what the code requires, so `enable()` probes its own extension points with `Disposable.is` / `ISelectionListener.is`, including at `:143` where the declared type at `:160` already guarantees it.
- `features/tools/change-bounds/change-bounds-tracker.ts:459,475` — `(this as any).parent = handle.parent` in the exported `MoveableResizeHandle` / `MoveableRoutingHandle`.
- `features/change-bounds/model.ts:124-126` — `GResizeHandle.hasFeature` returns `feature === hoverFeedbackFeature` without consulting the base class, so `enableFeatures()` on a resize handle is silently a no-op.
- `features/bounds/layouter.ts:54-59` — `StatefulLayouterExt` shadows the base class's state as `elementToBoundsData` / `layoutRegistry2`; the workaround name is part of the public constructor signature.
- `glsp-sprotty/src/layout-override.ts:33` — `ILayout.orderAgnostic` is optional with one consumer (`features/zorder/bring-to-front-command.ts:38`) that defaults it to `true`, so a custom layout silently opts into z-reordering.
- `features/tools/edge-creation/edge-creation-tool.ts:51` — `@optional() @inject(TYPES.Grid) protected grid: Grid` declares a non-optional type for an optional binding; `tool-palette.ts:82-84` gets the same pattern right.
- `base/shortcuts/shortcuts-manager.ts:44,53` — `getShortcuts()` and the `onDidChange` payload hand out the live `registrations` map behind a `ReadonlyMap` annotation.
- `base/model/glsp-model-source.ts:204` — `initialize(registry: GLSPActionHandlerRegistry)` narrows Sprotty's `ActionHandlerRegistry` parameter; `createInitializeClientSessionParameters` at `:144` calls `getHandledActionKinds()` with no guard.
- `base/drag-aware-mouse-listener.ts:58,62` are `protected` while `:77,81` are public, within one override contract.
- `features/layout/layout-elements-action.ts:108-114` — `ReduceFunction.get` indexes a closed namespace, so the exported `ReduceFunctionType` on `ResizeElementsAction` cannot carry an adopter-supplied reduce function.
- `base/view/mouse-tool.ts:43,82` — `rankedMouseListeners` is assigned only by `register`/`deregister`, so `notifyListenersByRank` iterates `undefined` if an event arrives before any listener registers.
- `base/default.module.ts:78,98,116,123` — `EditorContextService`, `GLSPMouseTool`, `DiagramLoader` and `SelectionService` are bound to themselves as service identifiers while `IToolManager`, `IModelChangeService` and `IFeedbackActionDispatcher` sit behind symbols; only the latter can be replaced without rebinding a concrete class. Adjacent to [#1400](https://github.com/eclipse-glsp/glsp/issues/1400).
- `glsp-sprotty/src/types.ts:37` — `TYPES.IToolFactory` is exported and used nowhere in the repository.
- `features/hover/hover.ts:59` — `GlspHoverMouseListener` names `EdgeCreationTool.ID` directly to decide whether hover is enabled. Adjacent to [#1471](https://github.com/eclipse-glsp/glsp/issues/1471).
- `utils/gmodel-util.ts:387` — `export const ALL_ROUTING_POINTS = undefined`, typed `undefined`, as public API.
- `default-modules.ts:174-186` — `initializeDiagramContainer` enforces "`defaultModule` must be first" only as a runtime `throw` on a positional check. Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
- No name collisions across the 738 exported top-level symbols in the client barrel, and `features/test/**` is correctly excluded from both the barrel and `package.json#files` — the barrel generator is doing its job. The problem is what is deliberately exported, not what leaked.
