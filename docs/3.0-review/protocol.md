# A4 — Protocol design

Surface swept: `packages/common/protocol/src` (92 files, ~8k LOC) — `action-protocol/`, `client-server-protocol/`,
`model/`, `sprotty-actions.ts`, `re-exports.ts` — plus the client and Node server code that consumes it.

The protocol is shared with the Java server, which is **out of scope**: no Java code was read. Where a finding would
require a corresponding Java-side change, it says so in one clause. That clause is a flag for
[#1743](https://github.com/eclipse-glsp/glsp/issues/1743), not an assessment of Java effort.

Every finding below was verified against the source.

See [index.md](index.md) for scope and the coverage register.

---

## Findings

### A4-1 · Request/response pairing is prose, not types — and the flagship request violates its own declared response type

- **Location:** `packages/common/protocol/src/action-protocol/base-protocol.ts:80-95` (the `_?: Res` phantom field) · `packages/server/server/src/common/actions/action-dispatcher.ts:432-437` (`respond`) · `packages/common/protocol/src/action-protocol/model-data.ts:27` (`RequestModelAction extends RequestAction<SetModelAction>`) · `packages/server/server/src/common/features/model/model-submission-handler.ts:81,106,128,193`
- **What's wrong:** `respond()` copies `requestId` onto _any_ `ResponseAction` regardless of the request's declared `Res`, and the default model flow answers a `RequestModelAction` with a `RequestBoundsAction` plus a `SetDirtyStateAction` — neither of which is a `SetModelAction` — correlating the eventual `SetModelAction` through a mutable `protected requestModelAction` field on a server singleton rather than through the wire.
- **Direction:** Either make the request→response kind pairing checked (a `responseKind` on the request, validated when stamping `responseId`), or stop modelling the load as a single request and make it an explicit multi-message session-initialization exchange.
- **Size:** L
- **Java impact:** the Java server implements the same stash-the-request pattern and would need the same restructuring.
- **Adjacent to:** [#1251](https://github.com/eclipse-glsp/glsp/issues/1251) — that issue is about payload size; this is about correlation and typing of the same cycle.

### A4-2 · Four mutually incompatible severity encodings in one protocol

- **Location:** `action-protocol/client-notification.ts:64` (`SeverityLevel = 'NONE'|'INFO'|'WARNING'|'ERROR'|'FATAL'|'OK'`) · `action-protocol/element-text-editing.ts:163-174` (`ValidationStatus.Severity`, a _numeric_ enum) · `action-protocol/element-validation.ts:38,44-48` (`Marker.kind: string` plus `MarkerKind.INFO='info'`) · `re-exports.ts:31` (`SIssueSeverity as GIssueSeverity` = `'error'|'warning'|'info'`)
- **What's wrong:** One concept is encoded as a screaming-case string union, a numeric enum serialized as ordinals over JSON, a lowercase marker-kind string, and a fourth lowercase union re-exported from Sprotty — and `Marker` is converted to `GIssue`/`GIssueSeverity` client-side (`packages/client/client/src/features/validation/validate.ts:106,147-157`), so two encodings coexist within a single feature.
- **Direction:** One severity type, string-valued, used by status, message, validation status and markers alike.
- **Size:** M
- **Java impact:** the numeric enum is an ordinal contract with the Java side and cannot be changed unilaterally.

### A4-3 · The diagram's identity (`sourceUri`) is an untyped `Args` key defined outside the protocol package

- **Location:** `packages/server/server/src/common/features/model/model-state.ts:39` (`SOURCE_URI_ARG = 'sourceUri'`) · `packages/client/client/src/base/model/diagram-loader.ts:180-184` · `action-protocol/model-data.ts:33` (`options?: Args`) · `packages/server/server/src/node/abstract-json-model-storage.ts:39-43` · contrast `action-protocol/model-saving.ts:31` (`SaveModelAction.fileUri`, a typed field for the same concept)
- **What's wrong:** The most load-bearing parameter of the protocol — which document this diagram edits — has no field anywhere in `@eclipse-glsp/protocol`; it is a string key owned by the _server_ package, stuffed into `RequestModelAction.options`, and `diagramType` is sent twice (typed in `InitializeClientSessionParameters.diagramType`, untyped again in the same bag at `diagram-loader.ts:182`).
- **Direction:** Promote source-model identity to a typed field on the session/model-request pair, and keep `Args` for genuinely domain-specific extras.
- **Size:** M
- **Java impact:** yes — the key is read by the Java storage layer too.
- **Adjacent to:** [#1748](https://github.com/eclipse-glsp/glsp/issues/1748) — that issue is about value _shape_; this is a required identity field having no field at all.

### A4-4 · Message direction is implemented by mutating the payload with `__`-prefixed markers

- **Location:** `packages/server/server/src/common/protocol/client-action.ts:22-37` (`__receivedFromClient`) · `packages/client/client/src/base/model/glsp-model-source.ts:42-58` (`__receivedFromServer`), `:64-81` (`__skipErrorIfNoHandler`) · routing decision at `packages/server/server/src/common/actions/client-action-handler.ts:53-58`
- **What's wrong:** Nothing in the protocol expresses which way an action flows, so both sides stamp extra properties onto the received object to stop echo loops — properties that ride along on `JSON.stringify` if that object is ever re-sent — and the server's forward rule degenerates to "has a non-empty `responseId` ⇒ it belongs to the client".
- **Direction:** Make direction part of the type system — separate `ClientBound`/`ServerBound` action unions, or an envelope field on `ActionMessage` — instead of an out-of-band mutation.
- **Size:** M
- **Java impact:** the Java server carries the same marker convention.

### A4-5 · Action kinds are a flat, unnamespaced string space — and it has already collided

- **Location:** `action-protocol/undo-redo.ts:29,52` (`'glspUndo'`, `'glspRedo'`) · `action-protocol/base-protocol.ts:30` · routing tables at `client-server-protocol/types.ts:22-24,73`
- **What's wrong:** Kinds are bare strings like `'center'`, `'fit'`, `'paste'`, `'layout'`, `'compound'`; the only defence against collision with Sprotty's own `'undo'`/`'redo'` was to hand-prefix two kinds with `glsp`, and adopter-defined kinds share the same flat space with no reservation rule, while `serverActions`/`clientActionKinds` route on those raw strings.
- **Direction:** A reserved-prefix convention (`glsp.*` for core, adopter-owned prefixes elsewhere), declared and — where cheap — enforced at registration.
- **Size:** M (mechanical, but touches every kind constant)
- **Java impact:** every kind string is a wire value shared with the Java server.

### A4-6 · Hand-written type guards have drifted from their interfaces — no response guard validates `responseId`

- **Location:** `action-protocol/model-data.ts:69` and 13 sibling `ResponseAction` guards, all using `Action.hasKind` · `action-protocol/model-layout.ts:156` (`LayoutOperation.is` never checks `isOperation`) · `action-protocol/element-type-hints.ts:180` (`RequestCheckEdgeAction.is` never checks `requestId`)
- **What's wrong:** Every guard is hand-written and each drifts differently: `{kind:'layout'}` passes `LayoutOperation.is` despite lacking the `isOperation` discriminator the server dispatches on, and `SetModelAction.is` accepts an object with no `responseId` even though the interface requires one.
- **Direction:** Derive guards from one declarative field spec per action, so a guard cannot disagree with its interface.
- **Size:** M
- **Java impact:** none — guards are TypeScript-only.

### A4-7 · Operations are unacknowledged notifications: success, no-op and failure are all invisible to the sender

- **Location:** `action-protocol/base-protocol.ts:190-200` (`Operation extends Action`, not `RequestAction`) · `packages/server/server/src/common/operations/operation-action-handler.ts:48-54,58-64` · `packages/server/server/src/common/operations/compound-operation-handler.ts:35-43` · contract text at `base-protocol.ts:219`
- **What's wrong:** An operation with no registered handler returns `[]` and vanishes without a trace; in readonly mode the answer is a user-facing `MessageAction` toast the client cannot correlate; and `CompoundOperation` — documented as executing a list of sub-operations — silently drops sub-operations whose handler is missing, so it applies partially with no atomicity guarantee stated anywhere.
- **Direction:** Give operations a correlatable acknowledgement (request/response, or an operation-result action carrying applied/rejected), and state the compound atomicity contract explicitly.
- **Size:** L
- **Java impact:** yes — the acknowledgement would have to be produced by the Java dispatcher too.
- **Adjacent to:** [#1632](https://github.com/eclipse-glsp/glsp/issues/1632) — that epic covers the error payload; this covers the absence of any reply at all, including on success.

### A4-8 · Twelve Sprotty actions are GLSP wire contract by re-export, and one guard is declared but never implemented

- **Location:** `sprotty-actions.ts:18-31` (imports), `:42-79` (ambient namespace declarations), `:81-114` (implementations) — `BringToFrontAction.is` is declared at `:43-45` and never assigned
- **What's wrong:** `GetSelectionAction`/`SelectionResult`, `GetViewportAction`/`ViewportResult`, `SetViewportAction`, `MoveAction`, `CollapseExpandAction` and others are GLSP wire actions defined only in a third-party TypeScript package, with no GLSP-owned schema, no `create` helper and no direction doc — and calling `BringToFrontAction.is(x)` type-checks but throws `is not a function` at runtime. The runtime throw is a live defect.
- **Direction:** Own the definitions GLSP actually puts on the wire in `action-protocol/`, and keep Sprotty types as a client-side rendering detail behind the `glsp-sprotty` seam.
- **Size:** M
- **Java impact:** these kinds are already implicitly part of the contract a Java server must understand; making them explicit is a documentation win there, not a break.

### A4-9 · The protocol does not separate wire actions from client-local UI actions — and tells the server about all of them

- **Location:** `action-protocol/viewport.ts:151-173` (`MoveViewportAction`, zero server references) · `action-protocol/model-layout.ts:177-198` (`TriggerLayoutAction`, zero server references) · `action-protocol/element-validation.ts:151-173` (`DeleteMarkersAction`, dispatched only client-side at `packages/client/client/src/features/validation/validate.ts:56,79`) · `packages/client/client/src/base/action-handler-registry.ts:38-40` (`getHandledActionKinds` returns _every_ registered kind) consumed at `packages/client/client/src/base/model/glsp-model-source.ts:144`
- **What's wrong:** Purely client-internal UI vocabulary lives in the cross-language shared protocol, and `clientActionKinds` — the server's routing table for what it may push — is computed as "every kind I happen to have a handler for", so the server is told the client accepts `moveViewport`, `triggerLayout`, `applyMarkers` and dozens of kinds it can never meaningfully send.
- **Direction:** Split the package (or at least the barrel) into wire protocol vs client action vocabulary, and let the client declare _received_ kinds explicitly rather than inferring them from handler registration.
- **Size:** M
- **Java impact:** none required, but it shrinks what a Java implementer must read.
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741) — the mirror-image direction of the same handshake.

### A4-10 · Element-id fields are spelled four different ways on the wire

- **Location:** `action-protocol/element-selection.ts:34,39` (`selectedElementsIDs`, `deselectedElementsIDs`) · `action-protocol/element-validation.ts:73` (`elementsIDs`) · `action-protocol/types.ts:117` (`selectedElementIds`) · `action-protocol/viewport.ts:34` and `element-creation.ts:137` (`elementIds`)
- **What's wrong:** `IDs` vs `Ids`, `elementsIDs` vs `elementIds` — one concept, four spellings, so no adopter can guess a field name and generated clients look incoherent.
- **Direction:** One casing (`elementIds`), applied everywhere, at the major boundary.
- **Size:** S mechanically, M with the Java side
- **Java impact:** yes — these are wire field names.

### A4-11 · The protocol cannot say "the model is loaded"; the client infers it, and `revision` is optional-but-required

- **Location:** `packages/client/client/src/base/model/model-initialization-constraint.ts:118-132` (sniffs the action stream for a non-empty `SetModel`/`UpdateModel` then an `InitializeCanvasBoundsAction`; "empty" is the magic root `type === 'NONE'`) · `action-protocol/model-layout.ts:72` (`revision?: number`) · `packages/server/server/src/common/features/layout/computed-bounds-action-handler.ts:52-60`
- **What's wrong:** There is no model-ready signal, so the client guesses using a Sprotty sentinel string as a wire value; and `ComputedBoundsAction.revision` is declared optional while a mismatch — including `undefined` — makes the server silently return `[]`, dropping the whole update cycle with no error and no reply.
- **Direction:** An explicit ready/committed signal on the model actions, and `revision` promoted to required with an explicit stale-bounds rejection instead of a silent drop.
- **Size:** M
- **Java impact:** yes, for the required `revision` and any new signal.
- **Adjacent to:** [#1251](https://github.com/eclipse-glsp/glsp/issues/1251).

### A4-12 · Three naming schemes for request/response pairs, and two protocol types not named `…Action`

- **Location:** `action-protocol/contexts.ts:26,58` (`RequestContextActions`/`SetContextActions` — the only protocol actions without an `Action` suffix), `:100,127` (`GetEditorContextAction`/`EditorContextResult`) · `action-protocol/element-type-hints.ts:156,215,239` (`RequestCheckEdgeAction`/`CheckEdgeResultAction`, whose kind string is `'checkEdgeTargetResult'`) · vs the `Request…`/`Set…` majority
- **What's wrong:** `Request…`/`Set…`, `Get…`/`…Result` and `Request…`/`…ResultAction` coexist; `CheckEdgeResultAction`'s kind string does not match its own type name; and the two `…ContextActions` types break the universal `…Action` suffix, which also makes `SetContextActions.is` read as a plural.
- **Direction:** Pick one pair convention and rename at the major boundary, including the divergent kind string.
- **Size:** S
- **Java impact:** the `'checkEdgeTargetResult'` kind string is a wire value.

### A4-13 · Four overlapping ways for the server to read client-side editor state

- **Location:** `action-protocol/types.ts:113-138` (`EditorContext` piggybacked on `RequestContextActions`, `RequestNavigationTargetsAction`, `RequestClipboardDataAction`, `CutOperation`, `PasteOperation`) · `action-protocol/contexts.ts:100-151` (`GetEditorContextAction`/`EditorContextResult`) · Sprotty's `GetSelectionAction`/`SelectionResult` and `GetViewportAction`/`ViewportResult` (`sprotty-actions.ts:87,89,102,113`) · the overlap acknowledged in prose at `contexts.ts:96-98`
- **What's wrong:** The same snapshot — selection, mouse, viewport, canvas bounds — is fetched by a server-initiated request, by two narrower server-initiated requests, and is also stapled onto five client-initiated requests: a fat context object repeated on the wire whose staleness semantics are documented but unenforceable.
- **Direction:** One server→client state query with a field selector, and stop piggybacking the full snapshot onto unrelated requests.
- **Size:** M
- **Java impact:** yes — `EditorContext` is consumed by Java handlers.

### A4-14 · Undo/redo are plain actions over a server-only stack the client cannot observe

- **Location:** `action-protocol/undo-redo.ts:24-63` (`UndoAction`/`RedoAction` extend `Action`, not `Operation`) · `packages/server/server/src/common/command/undo-redo-action-handler.ts:42-56` (returns `[]` when the stack is empty) · `packages/client/client/src/features/undo-redo/undo-redo-key-listener.ts:25,28` · `action-protocol/model-saving.ts:68` (`SetDirtyStateAction.reason` enumerates `'undo'|'redo'`)
- **What's wrong:** Undo/redo demonstrably modify the model yet carry no `isOperation` discriminator, so they bypass the operation pipeline including the readonly guard; and there is no `canUndo`/`canRedo` anywhere in the protocol, so the client fires them blind and gets total silence when the stack is empty — undo/redo UI state is simply unimplementable.
- **Direction:** Model them as operations, and add an availability signal alongside `SetDirtyStateAction`.
- **Size:** M
- **Java impact:** yes, for both the discriminator and the new signal.

### A4-15 · Four id concepts, and `ActionMessage.clientId` actually carries the session id

- **Location:** `action-protocol/base-protocol.ts:53-63` (`ActionMessage.clientId`) · `client-server-protocol/types.ts:30` (`applicationId`), `:62` (`clientSessionId`) · `client-server-protocol/glsp-client.ts:169` (`GLSPClient.Options.id`) · collapsed at `packages/client/client/src/base/model/glsp-model-source.ts:146,208,224` · `initializeClientSession` returns `Promise<void>` (`glsp-client.ts:121`, `glsp-server.ts:58`)
- **What's wrong:** The client sets `clientSessionId` and `ActionMessage.clientId` from the same value — `options.clientId ?? viewerOptions.baseDiv`, a DOM div id used as a wire identifier — while `applicationId` and the `GLSPClient` id are two further unrelated ids; the envelope field says "client" but the routing key is the session. And because session initialization returns nothing, a session can negotiate nothing and `clientActionKinds` can never be updated after it opens.
- **Direction:** Rename the envelope field to `sessionId`, and give session initialization a result so per-session capability negotiation becomes possible.
- **Size:** M
- **Java impact:** yes, for the envelope rename and the new result type.
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741) — that issue covers the _server_ handshake; this is the per-session one, which currently has no result at all.

---

## Appendix — remaining observations

- `RequestAction.timeout?: number` (`base-protocol.ts:90`) puts transport QoS in the action body, and both dispatchers mutate the caller's action in place to stamp it (`server/.../action-dispatcher.ts:298`, `client/.../action-dispatcher.ts:236`).
- `NavigationTarget` smuggles structured data through `Args` with hand-rolled encodings: element ids joined by `'&'` into one string (`element-navigation.ts:53,117-122`) and a text position split across `'line'`/`'column'` keys (`:130-155`). Adjacent to [#1748](https://github.com/eclipse-glsp/glsp/issues/1748).
- `ClipboardData` is `{[format: string]: string}` (`clipboard.ts:145-147`) — no binary support — and a `PasteOperation` carries clipboard data with no origin, diagram or version tag, so pasting across sessions or servers is undefined.
- `DeleteMarkersAction` (`element-validation.ts:151`) is documented as sendable by either side but has zero server references; only the client dispatches it, locally.
- `RequestMarkersAction.reason?: string` (`element-validation.ts:80`) vs `SetMarkersAction.reason?: MarkersReason` (`:122`) — one field, two types; same pattern at `SetEditModeAction.editMode: string` (`model-edit-mode.ts:32`), where the `EditMode` type appears only in `create`'s generic (`:42`).
- `RequestModelAction`'s TSDoc (`model-data.ts:23`) says "Sent from the server to the client in order to set the model" — copy-pasted from `SetModelAction`. Direction docs are the only direction spec, and at least one of them is wrong.
- `GShapePreRenderedElementSchema`/`GViewPortRootElementSchema` (`model/model-schema.ts:29-30`) and `GShapedPreRenderedElementSchema`/`GViewportRootElementSchema` (`re-exports.ts:39-40`) are the same Sprotty types exported twice under different names from one barrel (`index.ts:49,51`).
- `ChangeBoundsOperation.create` (`node-modification.ts:42`) is the only operation factory that omits the `args` option its base type declares.
- `CreateOperation` is the only operation dispatched on a composite key `` `${kind}_${elementTypeId}` `` (`server/.../operation-handler-registry.ts:27,35`); no other operation family has a second dispatch dimension.
- `GLSPModelSource.configureServeActions` (`glsp-model-source.ts:158-164` — note the typo in the method name) guards with `serverActions?.length === 0` and then unconditionally calls `serverActions.forEach`, so an unknown `diagramType` produces a `TypeError` instead of the intended error.
- "Clear the status" is expressed as `StatusAction.create('', { severity: 'NONE' })` (`diagram-loader.ts:232`, `model-submission-handler.ts:188`, `request-model-action-handler.ts:89`); `SeverityLevel` mixes severity with a lifecycle sentinel, and `'OK'` has no producer anywhere in the repo.
- `Operation` declares `args?: Args` on the base type (`base-protocol.ts:199`) while plain actions redeclare `args` ad hoc on six unrelated types (`contexts.ts:69`, `element-navigation.ts:210,306`, `element-text-editing.ts:84`, `tool-palette.ts:53,93`, `model-layout.ts:182`).
- `ExportResultAction.formatOptions?: unknown` / `RequestExportAction.formatOptions?: unknown` (`model-saving.ts:224,263`) is an `any`-shaped extension point validated only inside a client-side strategy; the overload trick gives no wire-level safety.
- `ValidationStatus.NONE` (`element-text-editing.ts:179-183`) carries a sentinel `ResponseError { code: -1, message: '', data: {} }` — an error object used to mean "no error".
- `SelectAction.create`'s `deselectedElementsIDs: string[] | boolean` parameter (`element-selection.ts:54`) has no counterpart on the wire type, which uses a separate `deselectAll?: boolean` — two ways to express deselection, one of them factory-only.
- `LayoutOperation` is constructed as an internal DTO and passed as a method argument that is never dispatched (`computed-bounds-action-handler.ts:54-57`, `model-submission-handler.ts:120,148`) — a wire type doubling as a server-internal parameter object.
