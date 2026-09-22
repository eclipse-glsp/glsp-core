# Protocol: `packages/common/protocol`

Swept: `packages/common/protocol/src` (92 files, ~8k LOC), covering `action-protocol/`, `client-server-protocol/`,
`model/`, `di/`, `sprotty-actions.ts` and `re-exports.ts`, plus the client and Node server code that consumes it.

**17 findings**, split into the wire contract (PROT-2 to PROT-15, with PROT-1, PROT-5 and PROT-7 [withdrawn](#withdrawn)) and
the shape of the package itself, which also ships the shared DI toolkit and two browser transports (PROT-16 to PROT-20).

**Triage is complete.** Every finding is filed under [#1766](https://github.com/eclipse-glsp/glsp/issues/1766), itself a
sub-issue of [#1744](https://github.com/eclipse-glsp/glsp/issues/1744).

**Five issues were consolidated after filing**, because their fixes land in the same code: the four wire-vocabulary
renames into [#1767](https://github.com/eclipse-glsp/glsp/issues/1767), both "what does this package own" questions
into [#1771](https://github.com/eclipse-glsp/glsp/issues/1771), and the `vscode-jsonrpc` dependency into the package
split at [#1781](https://github.com/eclipse-glsp/glsp/issues/1781). 17 findings, 12 issues. Each finding's own
`Filed as` line names the issue that carries it.

Thirteen findings carry `breaking`. Four do not and can land in a minor release:
[#1770](https://github.com/eclipse-glsp/glsp/issues/1770) (guards are TypeScript-only),
[#1779](https://github.com/eclipse-glsp/glsp/issues/1779) (folding `di` into the root barrel is additive),
[#1780](https://github.com/eclipse-glsp/glsp/issues/1780) and
[#1783](https://github.com/eclipse-glsp/glsp/issues/1783) (both live defects, internal).
[#1771](https://github.com/eclipse-glsp/glsp/issues/1771) is split and labelled `breaking` for its larger half: the
missing `BringToFrontAction.is` implementation can ship now, owning the re-exported Sprotty definitions cannot.

Eleven carry `needs-triage`, meaning the finding is evidenced but its proposed direction has not been argued through.
The candidate issues in the appendix are **not** triaged and are still worth a pass.

The protocol is shared with the Java server, which is **out of scope**: no Java code was read. Where a finding would
require a corresponding Java-side change, it says so in one clause. That clause is a flag for
[#1743](https://github.com/eclipse-glsp/glsp/issues/1743), not an assessment of Java effort.

**Two ceilings apply to this package, not one.** Besides the Java server, a good part of the wire vocabulary is
inherited from `sprotty-protocol` rather than owned here: `Action` and `RequestAction` extend their Sprotty
counterparts (`base-protocol.ts:26,80`), and the client half of every request/response exchange runs through Sprotty's
dispatcher. Where a finding touches an inherited type, its direction is bounded by what Sprotty's contract allows, and
the finding says so. That is a reason to scope the work carefully, not a reason to leave the GLSP-owned half wrong.
Each such finding separates the two.

The ceiling bounds what can be **renamed or removed**, not what can be **added**. A GLSP action may declare typed
fields its Sprotty base does not have and stay assignable to it; `RequestModelAction` already narrows `options` this
way (`model-data.ts:27,33`). Where a finding's direction is an extension rather than a change, it says so, because the
reflex to stay aligned with Sprotty reads those as out of bounds when they are not.

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

---

## Wire contract

### PROT-2 · Five severity encodings, three of them GLSP's own

> Filed as [#1767](https://github.com/eclipse-glsp/glsp/issues/1767), which also covers PROT-10, PROT-12 and PROT-15.

- **Location:** GLSP-owned are `action-protocol/client-notification.ts:64` (`SeverityLevel = 'NONE'|'INFO'|'WARNING'|'ERROR'|'FATAL'|'OK'`) · `action-protocol/element-text-editing.ts:163-174` (`ValidationStatus.Severity`, a _numeric_ enum) · `action-protocol/element-validation.ts:38,44-48` (`Marker.kind: string` plus `MarkerKind.INFO='info'`). Sprotty-owned are `sprotty-protocol/lib/model.d.ts:251` (`SIssueSeverity = 'error'|'warning'|'info'`, re-exported as `GIssueSeverity` at `re-exports.ts:31`) · `sprotty/lib/features/edit/edit-label.d.ts:52` (`Severity = 'ok'|'warning'|'error'`). Conversions happen at `packages/client/client/src/features/validation/issue-marker.ts:97-115` and `packages/client/client/src/features/label-edit/edit-label-validator.ts:35-44`
- **What's wrong:** One concept is encoded five ways, and the codebase pays for it at two conversion points. `createGIssue` (`issue-marker.ts:102-113`) switches over `marker.kind` to produce a `GIssueSeverity`, mapping `'error'` to `'error'`, `'warning'` to `'warning'` and `'info'` to `'info'`. The switch is an identity function whose only real effect is that any custom `Marker.kind`, which `Marker.kind: string` explicitly permits, falls through to the `'info'` initialiser and is silently downgraded. `toEditLabelValidationResult` (`edit-label-validator.ts:35-44`) collapses the six-valued numeric enum onto Sprotty's three-valued one, mapping `INFO` to `'ok'`.
- **Provenance:** Two of the five are Sprotty's and cannot be renamed here. `GIssueSeverity` is pinned by `IssueMarkerView.getPath()` (`sprotty/lib/features/decoration/views.js:48-49`), which switches on the three literals, and GLSP extends that class (`packages/client/client/src/views/issue-marker-view.tsx:24`) and `SIssueMarkerImpl` (`issue-marker.ts:31`). `Severity` is pinned by `IEditLabelValidator`, which GLSP implements (`edit-label-validator.ts:52`). The other three are GLSP's alone.
- **Direction:** The two Sprotty unions are both subsets of one GLSP union. Define `'none'|'ok'|'info'|'warning'|'error'|'fatal'` once, lowercase, and the combining follows: `MarkerKind`'s values are already byte-identical to `GIssueSeverity`, so typing `Marker.kind` as a proposal string over the shared union makes `createGIssue` a field copy and lets a custom kind keep its own severity instead of becoming `'info'`. `SeverityLevel` is GLSP-only and can be lowercased into the same union outright. What remains is narrowing at the two Sprotty boundaries, which is a real loss of information but an explicit one in a single place, instead of four independent vocabularies and two switches that look like translation and are not.
- **Size:** M
- **Java impact:** the numeric enum is an ordinal contract with the Java side and cannot be changed unilaterally. It is also the one encoding where the Sprotty ceiling does not apply, so it can be sequenced separately from the rest.

### PROT-3 · The diagram's identity (`sourceUri`) is an untyped `Args` key defined outside the protocol package

> Filed as [#1768](https://github.com/eclipse-glsp/glsp/issues/1768)

- **Location:** `packages/server/server/src/common/features/model/model-state.ts:39` (`SOURCE_URI_ARG = 'sourceUri'`) · `packages/client/client/src/base/model/diagram-loader.ts:180-184` · `action-protocol/model-data.ts:33` (`options?: Args`) · `packages/server/server/src/node/abstract-json-model-storage.ts:39-43` · contrast `action-protocol/model-saving.ts:31` (`SaveModelAction.fileUri`, a typed field for the same concept)
- **What's wrong:** The most load-bearing parameter of the protocol, which document this diagram edits, has no field anywhere in `@eclipse-glsp/protocol`; it is a string key owned by the _server_ package, stuffed into `RequestModelAction.options`, and `diagramType` is sent twice (typed in `InitializeClientSessionParameters.diagramType`, untyped again in the same bag at `diagram-loader.ts:182`).
- **Direction:** Promote source-model identity to a typed field on the session/model-request pair, and keep `Args` for genuinely domain-specific extras.
- **Sprotty:** This extends an inherited action, and that is compliant. GLSP's `RequestModelAction` already extends `sprotty.RequestModelAction` and already redeclares `options?: Args`, narrowing Sprotty's `options?: JsonMap` (`model-data.ts:27,33`; Sprotty's at `sprotty-protocol/lib/actions.d.ts:92-95`). Adding a typed sibling field is the same move one line down: the interface stays assignable to Sprotty's, the field survives the JSON round trip, and Sprotty reads only `options`. Worth stating outright, because the reflex to stay aligned with Sprotty would otherwise read this direction as out of bounds when it is not. The general form is worth adopting too. Where GLSP needs a first-class parameter on an inherited action, a typed field on the GLSP interface beats a string key in the untyped bag.
- **Size:** M
- **Counterpart:** [SRV-21](server.md#srv-21--modelstate-is-an-untyped-string-keyed-property-bag-fed-straight-from-client-options), filed as [#1806](https://github.com/eclipse-glsp/glsp/issues/1806). `sourceUri` is read out of the untyped bag that finding is about.
- **Java impact:** yes, the key is read by the Java storage layer too.
- **Adjacent to:** [#1748](https://github.com/eclipse-glsp/glsp/issues/1748). That issue is about value _shape_; this is a required identity field having no field at all. See also [SRV-21](server.md).

### PROT-4 · Message direction is implemented by mutating the payload with `__`-prefixed markers

> Filed as [#1769](https://github.com/eclipse-glsp/glsp/issues/1769)

- **Location:** `packages/server/server/src/common/protocol/client-action.ts:22-37` (`__receivedFromClient`) · `packages/client/client/src/base/model/glsp-model-source.ts:42-58` (`__receivedFromServer`), `:64-81` (`__skipErrorIfNoHandler`) · routing decision at `packages/server/server/src/common/actions/client-action-handler.ts:53-58`
- **What's wrong:** Nothing in the protocol expresses which way an action flows, so both sides stamp extra properties onto the received object to stop echo loops. Those properties ride along on `JSON.stringify` if the object is ever re-sent, and the server's forward rule degenerates to "has a non-empty `responseId` ⇒ it belongs to the client" (`client-action-handler.ts:53-58`).
- **Provenance, checked, and it does not bind:** The client marker is Sprotty's, name and shape. `DiagramServerProxy` declares `const receivedFromServerProperty = '__receivedFromServer'`, stamps it on receipt and reads it to decide forwarding (`sprotty/lib/model-source/diagram-server.js:46,100,129`). GLSP does **not** inherit that code: `GLSPModelSource extends ModelSource` (`glsp-model-source.ts:90`), no GLSP source references `DiagramServerProxy`, and Sprotty's `ModelSource` base has no marker logic. The literal is re-declared in GLSP (`glsp-model-source.ts:43,48,56`) and read only by GLSP. So this is a borrowed convention, not an inherited contract. Nothing in Sprotty reads GLSP's marker, and changing it costs no Sprotty compliance. The remaining break risk is GLSP's own, since `ServerAction.is` and the property are exported API. `__receivedFromClient` is GLSP's server-side mirror of the same idea, invented here because Sprotty has no server, and `__skipErrorIfNoHandler` is GLSP's alone and is about error suppression rather than direction, sharing only the mutate-the-payload mechanism.
- **Direction:** One declared `origin` on the action, replacing both `receivedFrom*` markers. `origin?: 'client' | 'server'` on GLSP's `Action` is an extension of Sprotty's `{ kind: string }` and is compliant on the terms above. The receiving transport sets it, exactly where the markers are stamped today, so it stays a locally-applied fact rather than a wire field. A sender-declared origin is unverifiable anyway, and keeping it off the wire makes this change message-format-neutral. That gives one name for one concept on both sides instead of two mirrored `__` literals and a third copy in Java. Whether the field is enumerable is worth deciding rather than inheriting: today's stamp is an own enumerable property, which is the whole reason it can ride along on a re-serialization, and a non-enumerable or symbol key removes that, at the price of not surviving `structuredClone` across the worker transports.
- **Direction, second half:** `origin` fixes one of the two jobs the boolean currently does. `LocalComputedBoundsAction.mark` ([CL-28](client.md)) sets the marker on a _client-produced_ action to mean "do not send this", which is a destination rather than an origin, and writing `origin: 'server'` there would be the same lie under a better name. So the pair is: `origin` records where an action came from and never lies, and an explicit local dispatch (`dispatchLocal`, or a destination argument at the dispatch call) expresses "do not forward". With those separated, `LocalRequestBoundsAction.is` no longer has to test for a marker's absence to tell a local bounds request from a server one.
- **Why not static `ClientBound`/`ServerBound` unions:** direction is not a static property of every action kind. `StatusAction` and `MessageAction` are both documented as "Sent by the server (or the client)" (`client-notification.ts:19,67`), so a static split needs a both-ways bucket and then stops being the thing that answers the routing question at runtime. An `origin` set at the boundary answers it for those two as well.
- **Size:** M
- **Counterpart:** [CL-28](client.md#cl-28--the-serveraction-marker-doubles-as-a-do-not-forward-flag-and-is-set-by-lying), filed as [#1797](https://github.com/eclipse-glsp/glsp/issues/1797). The client half, where the same marker also means "do not forward".
- **Java impact:** the Java server carries the same marker convention and would adopt the same field name. Wire-neutral if `origin` stays unserialized.

### PROT-6 · Hand-written type guards have drifted from their interfaces, and no response guard validates `responseId`

> Filed as [#1770](https://github.com/eclipse-glsp/glsp/issues/1770)

- **Location:** `action-protocol/base-protocol.ts:132-145` (`ResponseAction`, the namespace with no `hasKind`) · `action-protocol/model-data.ts:69` and 14 sibling `ResponseAction` guards, all falling back to `Action.hasKind` · `action-protocol/model-layout.ts:156` (`LayoutOperation.is` never checks `isOperation`) · `action-protocol/element-type-hints.ts:180` (`RequestCheckEdgeAction.is` never checks `requestId`) · `action-protocol/viewport.ts:50,167` (`CenterAction.elementIds`, `MoveViewportAction.moveX`/`moveY` declared required, never checked)
- **What's wrong:** 20 of the 75 hand-written guards in `action-protocol/` accept objects their interface rejects, and the drift is not random. It falls into four groups, three of which trace to one omission: `RequestAction` and `Operation` each declare a `hasKind` that folds in their discriminator (`base-protocol.ts:108,213`), and `ResponseAction` does not. So all 15 response guards reach one level up to `Action.hasKind` and none of them validates `responseId`, so `SetModelAction.is({kind: 'setModel', newRoot: {}})` is `true` against an interface that requires it. `LayoutOperation.is` and `RequestCheckEdgeAction.is` make the same reach past a helper that does exist, so `{kind: 'layout'}` passes despite lacking the `isOperation` discriminator the server dispatches on. The remaining three simply omit a declared required field.
- **Why it went unnoticed:** the guards are tested, and the test for exactly this defect tests something else. 66 cases across `action-protocol/*.spec.ts` are named "should return false for an object that does not have all required interface properties", and 61 of them assert it with `{ kind: 'notTheRightOne' }`, a wrong kind rather than a missing property (for example `model-data.spec.ts:75-77`). Not one of the 20 drifted guards has a test that could fail.
- **Direction:** Declare each action's fields once and derive the guard from that declaration, so that the declaration is what the compiler checks the interface against.
- **Size:** M
- **Java impact:** none, because guards are TypeScript-only.
- **See also:** [X-7](cross-cutting.md#x-7--three-coexisting-conventions-each-for-construction-and-for-type-guards).

#### Sketch

One new module, no runtime dependency. The load-bearing part is that the spec's _type_ is computed from the action
interface, so an interface and its guard cannot disagree without a compile error.

```ts
// utils/action-spec.ts: new module, no runtime dependency
export type PropSpec = 'string' | 'number' | 'boolean' | 'object' | 'array' | TypeGuard<unknown>;

const CHECKS = {
    string: (v: unknown) => typeof v === 'string',
    number: (v: unknown) => typeof v === 'number',
    boolean: (v: unknown) => typeof v === 'boolean',
    object: (v: unknown) => v !== null && typeof v === 'object',
    array: (v: unknown) => Array.isArray(v)
};

function check(object: AnyObject, spec: Record<string, PropSpec>, optional: boolean): boolean {
    for (const [key, s] of Object.entries(spec)) {
        const value = (object as any)[key];
        if (value === undefined) {
            if (!optional) return false;
            continue;
        }
        if (!(typeof s === 'function' ? s(value) : CHECKS[s](value))) return false;
    }
    return true;
}
```

The part that does the work is the _type_ of the spec, not the runtime:

```ts
/** Keys of `T` that are not optional. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T];
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

/** What the action declares itself, meaning everything its base does not already carry. */
type OwnFields<T, Base> = Omit<T, keyof Base | 'kind'>;

type RequiredSpec<T, Base> = { [K in RequiredKeys<OwnFields<T, Base>>]: PropSpec };
type OptionalSpec<T, Base> = { [K in OptionalKeys<OwnFields<T, Base>>]?: PropSpec };
```

`RequiredSpec` is a mapped type over the interface's own required keys, so the spec object must list exactly them.
Miss one and it does not compile; add a stray one and excess-property checking rejects it. Four entry points, each
baking in its own discriminator:

```ts
export function defineAction<T extends Action>(
    kind: string, required: RequiredSpec<T, Action>, optional?: OptionalSpec<T, Action>): TypeGuard<T>;

export function defineRequest<T extends RequestAction<any>>(
    kind: string, required: RequiredSpec<T, RequestAction<any>>, optional?: OptionalSpec<T, RequestAction<any>>): TypeGuard<T>;

export function defineResponse<T extends ResponseAction>(
    kind: string, required: RequiredSpec<T, ResponseAction>, optional?: OptionalSpec<T, ResponseAction>): TypeGuard<T>;

export function defineOperation<T extends Operation>(
    kind: string, required: RequiredSpec<T, Operation>, optional?: OptionalSpec<T, Operation>): TypeGuard<T>;
```

`defineResponse` checks `responseId`, `defineRequest` checks `requestId`, `defineOperation` checks `isOperation`.
None of them is skippable, because there is no other way to declare a guard. One call site per drift group:

```ts
// A (15 of these): responseId now checked, by construction
export const is = defineResponse<SetModelAction>(KIND, { newRoot: 'object' });

// B: isOperation now checked, even though there are no own fields
export const is = defineOperation<LayoutOperation>(KIND, {});

// C: requestId now checked
export const is = defineRequest<RequestCheckEdgeAction>(KIND, {
    edgeType: 'string', sourceElementId: 'string', targetElementId: 'string'
});

// D: this does NOT compile, because RequiredSpec derives elementIds as required from CenterAction itself
export const is = defineAction<CenterAction>(KIND, { animate: 'boolean', retainZoom: 'boolean' });
```

Group D is the one worth having. The first three fix 17 known bugs; D makes the class unwritable for every field
added from here on.

- **The weak point.** The type argument has to be explicit. `defineResponse<SetModelAction>(KIND, ...)` is safe, but `defineResponse(KIND, ...)` infers `T` as the constraint `ResponseAction`, whose own-field set is empty, so it accepts any spec and checks nothing beyond the discriminator. TypeScript cannot force the argument, because no parameter mentions `T`. A one-line lint rule closes it; nothing in the type system does.
- **Depth.** The spec checks presence and primitive type, exactly what `hasObjectProp` and friends check today. `newRoot: 'object'` does not validate a model root. No regression, and `PropSpec` accepting a `TypeGuard` leaves a path to deeper checks without promising one.
- **Scope.** Guards only, so this answers half of [X-7](cross-cutting.md#x-7--three-coexisting-conventions-each-for-construction-and-for-type-guards). Driving `create` from the same spec is a much larger change with a real API break: the factories carry positional required arguments, an options bag, and per-action defaults (`CenterAction.create` defaults `animate` to `true` and `retainZoom` to `false`, `viewport.ts:53-59`). Leaving them alone is what keeps this migration mechanical.
- **Hoisting.** `export const is` is not hoisted where a function declaration is. The package already has a 6-module type/action cycle, so a nested `TypeGuard` referencing another module's `is` could hit a temporal dead zone at module-eval time. Low risk, worth knowing before starting. This otherwise composes with the namespace-to-const refactor in [X-10](cross-cutting.md), since `is` becomes a const either way.
- **Migration.** 75 call sites, mechanical and incremental: each guard keeps its `(object: unknown) => object is T` signature, so nothing downstream sees a change and the module converts file by file. The compiler surfaces the drifted ones as it goes. No Java impact.
- **The one behavioural change.** The 15 response guards get stricter, so an object that omits `responseId` stops passing. Every `create` already sets `responseId: ''` (`base-protocol.ts:176`, `model-data.ts:74`), so anything built through the protocol's own factories is unaffected; what starts failing is a hand-built literal. That is the intended fix, and it is why this is M rather than S. It wants a changelog line. The existing suite stays green either way, because its positive cases already construct complete objects (`model-data.spec.ts:64-70`). Worth replacing those 61 negative tests with one that drops a required field, so the next drift fails in CI instead of waiting for the next review.

### PROT-8 · Twelve Sprotty actions are GLSP wire contract by re-export, and one guard is declared but never implemented

> Filed as [#1771](https://github.com/eclipse-glsp/glsp/issues/1771), which also covers PROT-9.

- **Location:** `sprotty-actions.ts:18-31` (imports), `:42-79` (ambient namespace declarations), `:81-114` (implementations), where `BringToFrontAction.is` is declared at `:43-45` and never assigned
- **What's wrong:** `GetSelectionAction`/`SelectionResult`, `GetViewportAction`/`ViewportResult`, `SetViewportAction`, `MoveAction`, `CollapseExpandAction` and others are GLSP wire actions defined only in a third-party TypeScript package, with no GLSP-owned schema, no `create` helper and no direction doc. Calling `BringToFrontAction.is(x)` type-checks but throws `is not a function` at runtime. The runtime throw is a live defect.
- **Direction:** Own the definitions GLSP actually puts on the wire in `action-protocol/`, and keep Sprotty types as a client-side rendering detail behind the `glsp-sprotty` seam.
- **Size:** M
- **Java impact:** these kinds are already implicitly part of the contract a Java server must understand; making them explicit is a documentation win there, not a break.
- **See also:** [cross-cutting.md](cross-cutting.md#re-exports).

### PROT-9 · Nothing separates an action that _must_ stay client-side from one that merely happens to

> Filed as [#1771](https://github.com/eclipse-glsp/glsp/issues/1771) together with PROT-8. The separate #1772 was closed into it.

- **Location:** `packages/client/client/src/base/feedback/feedback-action-dispatcher.ts:40-51` (why feedback cannot come from the server, stated in prose only) · `action-protocol/viewport.ts:48,95,164` (`CenterAction`, `FitToScreenAction`, `MoveViewportAction`, which are in the protocol) against `packages/client/client/src/features/viewport/zoom-viewport-action.ts:45` (`ZoomAction`) and `features/viewport/reposition.ts:42` (`RepositionAction`, which is not) · `action-protocol/model-layout.ts:182` (`TriggerLayoutAction`, in) against `packages/client/client/src/features/layout/layout-elements-action.ts:136,355` (`ResizeElementsAction`, `AlignElementsAction`, out)
- **What's wrong:** Two different categories are collapsed into one. Feedback actions genuinely cannot originate server-side, and for a structural reason: feedback survives only because an `IFeedbackEmitter` re-registers it after every model update, so a server-sent feedback action has no emitter and is discarded by the next `SetModelAction` (`feedback-action-dispatcher.ts:40-51`). Everything else in the client package is merely client-local _today_. All 45 action kinds declared in `packages/client/client/src` carry serializable payloads. Even `AlignElementsAction.selectFunction`, which reads like a callback, is a string union (`layout-elements-action.ts:334`). So the only thing separating the two categories is which package the file sits in, and that line does not follow the distinction: a Java server can construct a typed "center on these elements" action but not a typed "zoom by this factor" one, though neither involves the server at all. The runtime does not observe the split either. `clientActionKinds` is derived from handler registration and reports all 45 regardless.
- **Constraint:** the fix is not to declare direction statically. Both sides derive their declared vocabulary from what handlers are registered: the client from `getHandledActionKinds()` (`action-handler-registry.ts:38-40` → `glsp-model-source.ts:144`), the server by folding every handler's `actionKinds` into `serverActions` (`global-action-provider.ts:63-65` → `glsp-server.ts:104-108`). That symmetry is what lets an adopter add a server-side handler for a client-local kind and have the handshake follow. Any hand-maintained list of receivable kinds would break that and would drift from the registry. This finding is about where a type is _declared_, not about who may send it.
- **Direction:** Anything that could legitimately be sent belongs in the protocol package, in a dedicated client-actions section that says what it is: the vocabulary a server _may_ address to the client, none of which it is obliged to use. That moves the viewport and layout actions in, and it makes a server implementer's options a matter of reading one package. What stays behind is the genuinely undeliverable set, feedback and tool-internal state, and it is worth giving that set a marker of its own, a `FeedbackAction` base or interface, so "can this be dispatched from the server" becomes a type question rather than a question about file paths. The criterion belongs next to that marker, since it is exactly the kind of decision [X-14](cross-cutting.md) is about.
- **Size:** M
- **Java impact:** none required. It enlarges what a Java server can express without obliging it to express anything.
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741). The same handshake seen from the capability side.

### PROT-10 · Element-id fields are spelled four different ways on the wire

> Filed as [#1767](https://github.com/eclipse-glsp/glsp/issues/1767) together with PROT-2, PROT-12 and PROT-15. The separate #1773 was closed into it.

- **Location:** `action-protocol/element-selection.ts:34,39` (`selectedElementsIDs`, `deselectedElementsIDs`) · `action-protocol/element-validation.ts:73` (`elementsIDs`) · `action-protocol/types.ts:117` (`selectedElementIds`) · `action-protocol/viewport.ts:34` and `element-creation.ts:137` (`elementIds`)
- **What's wrong:** `IDs` against `Ids`, `elementsIDs` against `elementIds`: one concept, four spellings, so no adopter can guess a field name and generated clients look incoherent.
- **Direction:** One casing (`elementIds`), applied everywhere, at the major boundary.
- **Size:** S mechanically, M with the Java side
- **Java impact:** yes, these are wire field names.

### PROT-11 · The protocol cannot say "the model is loaded"; the client infers it, and `revision` is optional-but-required

> Filed as [#1774](https://github.com/eclipse-glsp/glsp/issues/1774)

- **Location:** `packages/client/client/src/base/model/model-initialization-constraint.ts:118-132` (sniffs the action stream for a non-empty `SetModel`/`UpdateModel` then an `InitializeCanvasBoundsAction`; "empty" is the magic root `type === 'NONE'`) · `action-protocol/model-layout.ts:72` (`revision?: number`) · `packages/server/server/src/common/features/layout/computed-bounds-action-handler.ts:52-60`
- **What's wrong:** There is no model-ready signal, so the client guesses using a Sprotty sentinel string as a wire value; and `ComputedBoundsAction.revision` is declared optional while a mismatch, `undefined` included, makes the server silently return `[]`, dropping the whole update cycle with no error and no reply.
- **Direction:** An explicit ready/committed signal on the model actions, and `revision` promoted to required with an explicit stale-bounds rejection instead of a silent drop.
- **Size:** M
- **Counterpart:** [CL-25](client.md#cl-25--diagram-loading-can-hang-forever-and-every-startup-hook-failure-is-swallowed) and [SRV-16](server.md#srv-16--the-initial-model-handshake-is-a-latch-and-a-revision-mismatch-strands-it-permanently), filed as [#1796](https://github.com/eclipse-glsp/glsp/issues/1796) and [#1805](https://github.com/eclipse-glsp/glsp/issues/1805). The two runtime halves of the same gap.
- **Java impact:** yes, for the required `revision` and any new signal.
- **Adjacent to:** [#1251](https://github.com/eclipse-glsp/glsp/issues/1251). See [CL-25](client.md) and [SRV-16](server.md) for the two runtime halves.

### PROT-12 · Three naming schemes for request/response pairs, and two protocol types not named `…Action`

> Filed as [#1767](https://github.com/eclipse-glsp/glsp/issues/1767) together with PROT-2, PROT-10 and PROT-15. The separate #1775 was closed into it.

- **Location:** `action-protocol/contexts.ts:26,58` (`RequestContextActions`/`SetContextActions`, the only protocol actions without an `Action` suffix), `:100,127` (`GetEditorContextAction`/`EditorContextResult`) · `action-protocol/element-type-hints.ts:156,215,239` (`RequestCheckEdgeAction`/`CheckEdgeResultAction`, whose kind string is `'checkEdgeTargetResult'`) · vs the `Request…`/`Set…` majority
- **What's wrong:** `Request…`/`Set…`, `Get…`/`…Result` and `Request…`/`…ResultAction` coexist; `CheckEdgeResultAction`'s kind string does not match its own type name; and the two `…ContextActions` types break the universal `…Action` suffix, which also makes `SetContextActions.is` read as a plural.
- **Direction:** Pick one pair convention and rename at the major boundary, including the divergent kind string.
- **Size:** S
- **Java impact:** the `'checkEdgeTargetResult'` kind string is a wire value.

### PROT-13 · Four overlapping ways for the server to read client-side editor state

> Filed as [#1776](https://github.com/eclipse-glsp/glsp/issues/1776)

- **Location:** `action-protocol/types.ts:113-138` (`EditorContext` piggybacked on `RequestContextActions`, `RequestNavigationTargetsAction`, `RequestClipboardDataAction`, `CutOperation`, `PasteOperation`) · `action-protocol/contexts.ts:100-151` (`GetEditorContextAction`/`EditorContextResult`) · Sprotty's `GetSelectionAction`/`SelectionResult` and `GetViewportAction`/`ViewportResult` (`sprotty-actions.ts:87,89,102,113`) · the overlap acknowledged in prose at `contexts.ts:96-98`
- **What's wrong:** The same snapshot of selection, mouse, viewport and canvas bounds is fetched by a server-initiated request, by two narrower server-initiated requests, and is also stapled onto five client-initiated requests: a fat context object repeated on the wire whose staleness semantics are documented but unenforceable.
- **Direction:** One server→client state query with a field selector, and stop piggybacking the full snapshot onto unrelated requests.
- **Size:** M
- **Java impact:** yes, `EditorContext` is consumed by Java handlers.

### PROT-14 · Undo/redo availability is computed on the server and thrown away, and the readonly guard does not reach them

> Filed as [#1777](https://github.com/eclipse-glsp/glsp/issues/1777)

- **Location:** `action-protocol/undo-redo.ts:24-63` (`UndoAction`/`RedoAction` extend `Action`, not `Operation`) · `packages/server/server/src/common/command/undo-redo-action-handler.ts:42-56`, which calls `commandStack.canUndo()` and `canRedo()` and returns `[]` when false · readonly guard at `packages/server/server/src/common/operations/operation-action-handler.ts:44-55` · `packages/client/client/src/features/undo-redo/undo-redo-key-listener.ts:25,28` · `action-protocol/model-saving.ts:68` (`SetDirtyStateAction.reason` enumerates `'undo'|'redo'`)
- **Constraint, stated nowhere in the code:** undo and redo are actions *on purpose*. `OperationActionHandler.executeHandler` passes every command it produces to `commandStack.execute` (`:66-76`), so routing undo through the operation pipeline unchanged would record the undo itself on the stack. This is a real design constraint, not an oversight, and the absence of any comment saying so is the reason it reads as one.
- **What's wrong:** Two consequences follow that the constraint does not require. The server evaluates `canUndo()`/`canRedo()` on every request and discards the answer, and the protocol has no field to carry it, so the client fires blind and gets silence when the stack is empty, so undo/redo UI state is unimplementable. And because the readonly check lives in `OperationActionHandler`, undo and redo are not covered by it: a readonly session still applies them.
- **Direction:** Model them as operations after all, with explicit handling in `OperationActionHandler` that skips the command-stack recording, so the readonly guard and the dispatch path are shared and only the recording differs. Add a `canUndo`/`canRedo` signal alongside `SetDirtyStateAction`; the value already exists server-side, it just has no field to travel in. Whatever is decided, write the recording constraint down next to the types.
- **Size:** M
- **Java impact:** yes, for both the discriminator and the new signal.
- **See also:** [#1749](https://github.com/eclipse-glsp/glsp/issues/1749), which carries the former `CL-22`. Readonly enforcement is scattered across entry points rather than gated on dispatch, which is the same gap seen from the client.

### PROT-15 · Four id concepts, and `ActionMessage.clientId` actually carries the session id

> Filed as [#1767](https://github.com/eclipse-glsp/glsp/issues/1767) together with PROT-2, PROT-10 and PROT-12. The separate #1778 was closed into it. The session-initialization result is flagged there as separable, adjacent to [#1741](https://github.com/eclipse-glsp/glsp/issues/1741).

- **Location:** `action-protocol/base-protocol.ts:53-63` (`ActionMessage.clientId`) · `client-server-protocol/types.ts:30` (`applicationId`), `:62` (`clientSessionId`) · `client-server-protocol/glsp-client.ts:169` (`GLSPClient.Options.id`) · collapsed at `packages/client/client/src/base/model/glsp-model-source.ts:146,208,224` · `initializeClientSession` returns `Promise<void>` (`glsp-client.ts:121`, `glsp-server.ts:58`)
- **What's wrong:** The client sets `clientSessionId` and `ActionMessage.clientId` from the same value, `options.clientId ?? viewerOptions.baseDiv`, a DOM div id used as a wire identifier, while `applicationId` and the `GLSPClient` id are two further unrelated ids; the envelope field says "client" but the routing key is the session. And because session initialization returns nothing, a session can negotiate nothing and `clientActionKinds` can never be updated after it opens.
- **Direction:** Rename the envelope field to `sessionId`, and give session initialization a result so per-session capability negotiation becomes possible.
- **Size:** M
- **Java impact:** yes, for the envelope rename and the new result type.
- **Adjacent to:** [#1741](https://github.com/eclipse-glsp/glsp/issues/1741). That issue covers the _server_ handshake; this is the per-session one, which currently has no result at all.

---

## Withdrawn

**Request/response pairing is prose, not types** (the previous `PROT-1`, hence the gap in the numbering). It recorded
that `RequestModelAction` declares `SetModelAction` as its response while the load flow answers with something else
and correlates through a mutable field on a server singleton.

The protocol half does not survive scrutiny. The whole exchange is inherited, not declared here:
`RequestModelAction extends RequestAction<SetModelAction>, sprotty.RequestModelAction` (`model-data.ts:27`), and
`SetModelAction`, `RequestBoundsAction` and `ComputedBoundsAction` likewise extend their Sprotty counterparts
(`model-data.ts:57`, `model-layout.ts:30,62`). Sprotty's own `DiagramServer` runs the same four-step exchange against
the same types without a latch, so the shape is coherent and the declared pairing is right. What is left is GLSP's
server implementation diverging from it, which is [SRV-16](server.md), now carrying Sprotty's threading of the
causing action as the model for the fix.

**Operations are unacknowledged notifications** (the previous `PROT-7`, hence the gap in the numbering). It recorded
that an `Operation` extends `Action` rather than `RequestAction`, so success, no-op and failure are all invisible to
the sender.

[#1632](https://github.com/eclipse-glsp/glsp/issues/1632) already owns this, and owns more of it than this review
credited. That epic's first proposed approach is to make `RequestAction` the base class for operations, which it notes
"requires introduction of a success response action and handling of rejections". The success path, which is what
this finding claimed as its distinct contribution, is named in the epic. Nothing is left over.

**Action kinds are a flat, unnamespaced string space** (the previous `PROT-5`, hence the gap in the numbering). It
proposed a reserved-prefix convention, `glsp.*` for core and adopter-owned prefixes elsewhere, on the evidence that
the space "has already collided".

It has not. Comparing all 65 `KIND` constants in `action-protocol/` against the 34 in `sprotty-protocol/lib/actions.d.ts`
gives 16 shared strings, and every one of them is deliberate: each GLSP interface extends the Sprotty action of that
kind, including the two the finding cited as generic squatting: `CenterAction extends Action, sprotty.CenterAction`
and `FitToScreenAction extends Action, sprotty.FitToScreenAction` (`viewport.ts:27,70`), and including `'layout'`,
where `LayoutOperation extends Operation, Omit<sprotty.LayoutAction, 'layoutType'>` (`model-layout.ts:151`). Sharing
the kind is the point in all 16 cases. The one place GLSP needed a genuinely different action under an existing name,
`UndoAction` and `RedoAction`, was resolved by declaring `'glspUndo'`/`'glspRedo'` and `Omit`-ing the inherited kind
(`undo-redo.ts:23-29,46-52`). That is the correct fix, applied deliberately, not damage control after an accident.

So a naming scheme across 65 kinds, every one of them a wire value requiring Java coordination, would be governance
bought against a failure that has not occurred in the project's lifetime. Nothing is left over.

---

## Package shape, DI toolkit and transports

The protocol package is also where the shared DI helpers and two browser transports live; these findings are about the
package, not the wire.

### PROT-16 · The protocol package's DI API is reachable only through a `lib/` deep path

> Filed as [#1779](https://github.com/eclipse-glsp/glsp/issues/1779)

- **Location:** `packages/common/protocol/src/index.ts` (no `./di` export) · `packages/common/protocol/package.json:38-39` (`main`/`types`, no `exports` map) · 9 source call sites, e.g. `packages/server/server/src/common/reexport.ts:19`, `packages/server/server/src/common/di/glsp-module.ts:16`, `packages/client/glsp-sprotty/src/re-exports.ts:21`, `packages/client/glsp-sprotty/src/feature-modules.ts:17`
- **What's wrong:** `BindingContext`, `bindOrRebind`, `FeatureModule` and `LazyInjector` are absent from the root barrel, so both the server _and_ the client import them as `@eclipse-glsp/protocol/lib/di`. The compiler output directory is part of the public import path, and `packages/server/server/src/common/utils/registry.ts:16` even deep-imports `lib/utils/array-util` for `remove`, which the root barrel already exports.
- **Direction:** Either fold `di` into the root barrel or declare real `exports` subpaths (`@eclipse-glsp/protocol/di`), so `lib/` stops being API.
- **Size:** M
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740). That issue owns the `exports` map, because moving to ESM forces one. This finding is the narrower question of whether `di` also belongs in the root barrel, which is additive and can land before it.

### PROT-17 · `DefaultLazyInjector` shares one cache between `get` and `getAll`, and caches misses forever

> Filed as [#1780](https://github.com/eclipse-glsp/glsp/issues/1780)

- **Location:** `packages/common/protocol/src/di/lazy-injector.ts:80,93-99,104-108`
- **What's wrong:** `getOptional` stores a single instance under the service identifier while `getAll` returns `cache.get(id) as T[]` without checking what shape was cached, so `get(X)` followed by `getAll(X)` hands back a single object typed as an array. `undefined`/`[]` is also cached permanently, so anything bound after the first lookup is invisible. This is a live defect.
- **Direction:** Key the cache by `(identifier, mode)` and stop memoizing misses.
- **Size:** S
- **Counterpart:** [CL-32](client.md#cl-32--lazyinjector-has-institutionalized-the-service-locator-with-typesemptyarray-injected-to-satisfy-inversify), filed as [#1790](https://github.com/eclipse-glsp/glsp/issues/1790). The client is the heavy user of this service.

### PROT-18 · `@eclipse-glsp/protocol` is a protocol package, a DI toolkit and a browser transport in one flat barrel

> Filed as [#1781](https://github.com/eclipse-glsp/glsp/issues/1781), which also covers PROT-19.

- **Location:** `packages/common/protocol/src/client-server-protocol/jsonrpc/worker-connection-provider.ts:16` (`vscode-jsonrpc/browser`, `new Worker(url)`) · `websocket-connection.ts:47` (`wrap(socket: WebSocket)`) · `packages/common/protocol/src/di/` (8 inversify modules) · all surfaced through `packages/common/protocol/src/index.ts:44-45,50`
- **What's wrong:** The one package both sides share has no `common`/`browser`/`node` split, unlike `@eclipse-glsp/server`, so the Node server's `common/reexport.ts:18` re-exports `GLSPWebWorkerProvider`, and every Node consumer inherits browser-global-typed API from the wire protocol.
- **Direction:** Split protocol into the wire contract (actions, schema, types) and the transport/DI adapters, using the same `common`/`browser`/`node` layout the server packages already have.
- **Size:** L

### PROT-19 · `Emitter extends jsonrpc.Emitter` makes vscode-jsonrpc's Node entry a value dependency of the whole client

> Filed as [#1781](https://github.com/eclipse-glsp/glsp/issues/1781) together with PROT-18. The separate #1782 was closed into it.

- **Location:** `packages/common/protocol/src/utils/event.ts:16,109` · `packages/common/protocol/src/utils/disposable.ts:16` · consequence at `examples/workflow-standalone/esbuild.js:105` (`external: ['fs', 'net'], // node builtins potentially pulled in by ws`)
- **What's wrong:** The two most-imported utility modules in the protocol, `Disposable` and `Event`, take a _runtime_ dependency on `vscode-jsonrpc`, whose bare specifier resolves to `lib/node/main.js`, so the browser diagram bundle has to externalize Node builtins to build at all.
- **Direction:** Define `Disposable`/`Event`/`Emitter` standalone, roughly 20 lines, and confine the jsonrpc types to `client-server-protocol/jsonrpc/`.
- **Size:** M

### PROT-20 · `re-decorate.ts` mutates a class from another module as an import side effect

> Filed as [#1783](https://github.com/eclipse-glsp/glsp/issues/1783)

- **Location:** `packages/common/protocol/src/di/re-decorate.ts:22` (`decorate(injectable(), JsonrpcClientProxy);`) · exported from `packages/common/protocol/src/di/index.ts:20`
- **What's wrong:** Importing anything from `protocol/lib/di`, which `glsp-sprotty` and the server both do at barrel level, executes a global `decorate()` on a class defined in `client-server-protocol/jsonrpc/base-jsonrpc-glsp-client.ts`. If two copies of the protocol package are ever loaded (the Theia/VS Code integrations, or deep plus bare imports of the same package), inversify throws on the second application.
- **Direction:** Decorate `JsonrpcClientProxy` at its definition site, or bind it explicitly where it is consumed, rather than by import side effect.
- **Size:** S
- **Adjacent to:** [#1740](https://github.com/eclipse-glsp/glsp/issues/1740).

---

## Related findings in other components

- [CL-1](client.md): `@eclipse-glsp/client` re-exports it transitively through `@eclipse-glsp/sprotty`.
- [examples appendix](examples.md#appendix-candidate-issues): the MCP demo carries its own hard-coded copy of the protocol version.
- [X-2](cross-cutting.md): `FeatureModule`'s silent `requires` failure lives in this package but is a workspace-wide composition problem.

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

- `RequestAction.timeout?: number` (`base-protocol.ts:90`) puts transport QoS in the action body, and both dispatchers mutate the caller's action in place to stamp it (`server/.../action-dispatcher.ts:298`, `client/.../action-dispatcher.ts:236`).
- `NavigationTarget` smuggles structured data through `Args` with hand-rolled encodings: element ids joined by `'&'` into one string (`element-navigation.ts:53,117-122`) and a text position split across `'line'`/`'column'` keys (`:130-155`). Adjacent to [#1748](https://github.com/eclipse-glsp/glsp/issues/1748).
- `ClipboardData` is `{[format: string]: string}` (`clipboard.ts:145-147`), so there is no binary support, and a `PasteOperation` carries clipboard data with no origin, diagram or version tag, so pasting across sessions or servers is undefined.
- `DeleteMarkersAction` (`element-validation.ts:151`) is documented as sendable by either side but has zero server references; only the client dispatches it, locally.
- `RequestMarkersAction.reason?: string` (`element-validation.ts:80`) vs `SetMarkersAction.reason?: MarkersReason` (`:122`): one field, two types; same pattern at `SetEditModeAction.editMode: string` (`model-edit-mode.ts:32`), where the `EditMode` type appears only in `create`'s generic (`:42`).
- `RequestModelAction`'s TSDoc (`model-data.ts:23`) says "Sent from the server to the client in order to set the model": copy-pasted from `SetModelAction`. Direction docs are the only direction spec, and at least one of them is wrong.
- `GShapePreRenderedElementSchema`/`GViewPortRootElementSchema` (`model/model-schema.ts:29-30`) and `GShapedPreRenderedElementSchema`/`GViewportRootElementSchema` (`re-exports.ts:39-40`) are the same Sprotty types exported twice under different names from one barrel (`index.ts:49,51`).
- `ChangeBoundsOperation.create` (`node-modification.ts:42`) is the only operation factory that omits the `args` option its base type declares.
- `CompoundOperation` is documented as executing a list of sub-operations (`base-protocol.ts:219`) but `compound-operation-handler.ts:35-43` silently drops any whose handler is missing, so it can apply partially with no atomicity guarantee stated anywhere. Likely absorbed by [#1632](https://github.com/eclipse-glsp/glsp/issues/1632); if not, the contract still needs writing down.
- `CreateOperation` is the only operation dispatched on a composite key `` `${kind}_${elementTypeId}` `` (`server/.../operation-handler-registry.ts:27,35`); no other operation family has a second dispatch dimension.
- `GLSPModelSource.configureServeActions` (`glsp-model-source.ts:158-164`: note the typo in the method name) guards with `serverActions?.length === 0` and then unconditionally calls `serverActions.forEach`, so an unknown `diagramType` produces a `TypeError` instead of the intended error.
- "Clear the status" is expressed as `StatusAction.create('', { severity: 'NONE' })` (`diagram-loader.ts:232`, `model-submission-handler.ts:188`, `request-model-action-handler.ts:89`); `SeverityLevel` mixes severity with a lifecycle sentinel, and `'OK'` has no producer anywhere in the repo.
- `Operation` declares `args?: Args` on the base type (`base-protocol.ts:199`) while plain actions redeclare `args` ad hoc on six unrelated types (`contexts.ts:69`, `element-navigation.ts:210,306`, `element-text-editing.ts:84`, `tool-palette.ts:53,93`, `model-layout.ts:182`).
- `ExportResultAction.formatOptions?: unknown` / `RequestExportAction.formatOptions?: unknown` (`model-saving.ts:224,263`) is an `any`-shaped extension point validated only inside a client-side strategy; the overload trick gives no wire-level safety.
- `ValidationStatus.NONE` (`element-text-editing.ts:179-183`) carries a sentinel `ResponseError { code: -1, message: '', data: {} }`: an error object used to mean "no error".
- `SelectAction.create`'s `deselectedElementsIDs: string[] | boolean` parameter (`element-selection.ts:54`) has no counterpart on the wire type, which uses a separate `deselectAll?: boolean`: two ways to express deselection, one of them factory-only.
- `LayoutOperation` is constructed as an internal DTO and passed as a method argument that is never dispatched (`computed-bounds-action-handler.ts:54-57`, `model-submission-handler.ts:120,148`): a wire type doubling as a server-internal parameter object.
- `re-exports.ts:54-58` re-exports whole sprotty modules (`sprotty-protocol/lib/utils/async`, `.../geometry`, `.../json`) wholesale, so sprotty additions silently become GLSP protocol API.
- The protocol's own 6-module type/action cycle: `utils/type-util.ts:17` → `action-protocol/base-protocol.ts:18` → `action-protocol/types.ts:20` → back, with `type-util` (fan-in 38) as the entry point.
- `resolveContainerConfiguration` handles a `replace` whose target is absent by `console.warn`ing and appending at the end (`di/container-configuration.ts:63-69`): a failed replace silently becomes an add at the least useful position. Adjacent to [#1742](https://github.com/eclipse-glsp/glsp/issues/1742).
