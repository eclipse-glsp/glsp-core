# GLSP 3.0 Codebase Review

A read-only architecture and design review of `glsp-core`, run ahead of the GLSP 3.0 release
([eclipse-glsp/glsp#1738](https://github.com/eclipse-glsp/glsp/issues/1738)).

Its purpose is to surface **additional** improvement candidates that the epic's existing sub-issues do not already
cover, while a major-version boundary makes any change possible. The sweep itself made no code changes. Findings are
filed as issues only once they have been reviewed, so the document and the tracker are deliberately out of step: what
is still here is what has not been decided yet.

## How this document is organized

Findings are filed **by component**. A finding lives in the file of the component that owns the code to change; a
finding that cannot be fixed inside one component lives in [cross-cutting.md](triaged/cross-cutting.md).

### Open

None. **Triage is complete**: every finding in this review is either filed as an issue under
[#1744](https://github.com/eclipse-glsp/glsp/issues/1744) or recorded as withdrawn with its reason.

### Triaged

A file moves to `triaged/` once **every** finding in it has been through review and come out the other side: either
an issue is open for it, or it is recorded as withdrawn with the reason. Nothing in `triaged/` needs reading to decide
what to do next, because the tracker has it.

The rule covers findings only. A triaged file's **candidate issues** have not been decided; they stay in its appendix
and are still worth a pass.

| File                                     | Component                            | Findings | Where they live now                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [triaged/e2e.md](triaged/e2e.md)         | `e2e/playwright`, `e2e/workflow-e2e` | 3        | [#1762](https://github.com/eclipse-glsp/glsp/issues/1762), [#1763](https://github.com/eclipse-glsp/glsp/issues/1763), [#1764](https://github.com/eclipse-glsp/glsp/issues/1764), under [#1761](https://github.com/eclipse-glsp/glsp/issues/1761) |
| [triaged/examples.md](triaged/examples.md) | `examples/*`                       | 1        | [#1765](https://github.com/eclipse-glsp/glsp/issues/1765)                                                                                                                                          |
| [triaged/protocol.md](triaged/protocol.md) | `packages/common/protocol`         | 17       | 12 issues under [#1766](https://github.com/eclipse-glsp/glsp/issues/1766); five were consolidated after filing                                                                                      |
| [triaged/tooling.md](triaged/tooling.md) | lint, build, packaging, `dev-packages/*` | 1     | [#1784](https://github.com/eclipse-glsp/glsp/issues/1784)                                                                                                                                          |
| [triaged/client.md](triaged/client.md)   | `packages/client/*`                  | 27       | 14 issues under [#1815](https://github.com/eclipse-glsp/glsp/issues/1815); clusters share one issue |
| [triaged/server.md](triaged/server.md)   | `packages/server/*`                  | 28       | 12 issues under [#1816](https://github.com/eclipse-glsp/glsp/issues/1816); clusters share one issue |
| [triaged/cross-cutting.md](triaged/cross-cutting.md) | spans components, workspace conventions | 13 | 4 issues under [#1817](https://github.com/eclipse-glsp/glsp/issues/1817); clusters share one issue |

Within a component file, findings are grouped by concern: public API, runtime model, DI and modules, layering. Those
are different kinds of decision, which is why they are grouped that way rather than by area of the codebase.

**Cross-cutting is two things**, and [cross-cutting.md](triaged/cross-cutting.md) keeps them apart: eight *findings* that
require a coordinated change in more than one component, and six *themes* whose individual instances are already
filed against a component. A theme does not become an issue; it is the argument for deciding a group of issues
together.

Each component file ends with **Related findings in other components**, so a reader working on one package sees what
else reaches into it.

## Scope

**In scope.** `glsp-core` as it stands today: the diagram client, the Node server, the shared protocol, and the
in-tree examples.

**Out of scope.**

- `glsp-server-java`. Protocol findings note where a Java-side change would be required, but the Java code was not
  reviewed.
- The downstream integration repositories (Theia, VS Code). Adopter impact in this document is an **estimate**, not
  a measurement. No call sites were counted.

  This exclusion has teeth. Any claim in this review of the form "nothing binds X", "X is referenced nowhere" or "X is
  dead code" is a statement about `glsp-core` only, and an extension point exists precisely so that something outside
  the repository can use it. The previous `CL-8` and `CL-23` were withdrawn for exactly this reason. Read every such claim as
  "unused here", and check the integrations before deleting anything.
- The 28 existing sub-issues of the epic. They may receive an added note here, and a finding may flag a conflict
  with one of their proposals, but none of them is re-scoped by this review.
- ESM and Inversify 8 ([#1740](https://github.com/eclipse-glsp/glsp/issues/1740)) are treated as a _technical_
  migration, not an architectural one. Findings note where they interact; nothing here is premised on their outcome.

**Partially covered components.** Test architecture and build/dev tooling were deliberately excluded: neither
requires a major-version boundary, so spending the 3.0 window on them spends a scarce resource on a cheap problem.
The consequence is that [triaged/e2e.md](triaged/e2e.md), [tooling.md](triaged/tooling.md) and [examples.md](triaged/examples.md) carry only what the
other sweeps happened to surface from the outside. Each of those three files ends with an explicit **What was not
reviewed** list, so the gap is visible rather than implied. `dev-packages/cli` in particular has no findings because
nobody looked at it.

## How to read a finding

Each finding carries: a **location** (`file:line`), **what's wrong** in one sentence, a non-binding **direction**,
a rough **size** (S/M/L), and a cross-reference to an existing sub-issue where one is adjacent.

There is deliberately **no severity, priority, or breaking/non-breaking classification**. Every finding is
something that can be addressed; deciding which ones are worth addressing for 3.0 is the review's job, not the
document's.

Some findings are marked with a **cluster**. A cluster is a set of findings whose fixes land in the same code, so
filing one ticket per finding would produce several tickets competing for one diff. The finding keeps its own file,
evidence and id; the cluster records that it should be scoped with the others. Each file lists its clusters before its
withdrawals, and each member carries a `**Cluster:**` line back to that list.

A cluster is not a theme. A **theme** in [cross-cutting.md](triaged/cross-cutting.md#themes) groups findings that stay in
separate tickets and is only the argument for deciding them together. A cluster is a proposal for one ticket.

### Findings that span components

Two shapes, and which one applies depends on whether the protocol is involved.

A change needed on the **client and the server** is one finding in [cross-cutting.md](triaged/cross-cutting.md). The DI,
naming and TypeScript findings are all of this shape, and none of them has a per-component twin.

A change needed in the **protocol and in an implementation** is a pair, one finding in each file, linked by a
`**Counterpart:**` line. They are separate because the wire change and the implementation change are separately
decidable, separately sized, and only the protocol leg carries the Java-side clause. There are four such pairs:

| Protocol | Implementation | Subject |
| -------- | -------------- | ------- |
| [PROT-4](triaged/protocol.md) ([#1769](https://github.com/eclipse-glsp/glsp/issues/1769)) | [CL-28](triaged/client.md) | the `__receivedFrom*` direction marker |
| [PROT-3](triaged/protocol.md) ([#1768](https://github.com/eclipse-glsp/glsp/issues/1768)) | [SRV-21](triaged/server.md) | `sourceUri` as an untyped `Args` key |
| [PROT-17](triaged/protocol.md) ([#1780](https://github.com/eclipse-glsp/glsp/issues/1780)) | [CL-32](triaged/client.md) | `LazyInjector` |
| [PROT-11](triaged/protocol.md) ([#1774](https://github.com/eclipse-glsp/glsp/issues/1774)) | [SRV-16](triaged/server.md), [CL-25](triaged/client.md) | the model-ready signal and `revision` |

Both legs of every pair are now filed and cross-linked in each issue's `Related` section: #1769 with #1797, #1768 with #1806, #1780 with #1790, and #1774 with #1805 and #1796.

**15 clusters cover 53 of the 90 findings.** The remaining 37 are independent, either because the fix is self-contained
or because they are already adjacent to an existing issue.

| File | Clusters |
| ---- | -------- |
| [client.md](triaged/client.md) | [input handling](triaged/client.md#cluster-input-handling) (7), [the Sprotty seam](triaged/client.md#cluster-the-sprotty-seam) (3), [DI and service identifiers](triaged/client.md#cluster-di-and-service-identifiers) (3), [type hints](triaged/client.md#cluster-type-hints) (2), [client and server action flow](triaged/client.md#cluster-client-and-server-action-flow) (2), [feedback](triaged/client.md#cluster-feedback) (2) |
| [server.md](triaged/server.md) | [handler contribution](triaged/server.md#cluster-handler-contribution) (5), [session lifecycle](triaged/server.md#cluster-session-lifecycle) (4), [DI and binding mechanics](triaged/server.md#cluster-di-and-binding-mechanics) (4), [the graph model](triaged/server.md#cluster-the-graph-model) (4), [the model update pipeline](triaged/server.md#cluster-the-model-update-pipeline) (3), [layout-elk](triaged/server.md#cluster-layout-elk) (2) |
| [cross-cutting.md](triaged/cross-cutting.md) | [TypeScript and compiler configuration](triaged/cross-cutting.md#cluster-typescript-and-compiler-configuration) (5), [naming and shape conventions](triaged/cross-cutting.md#cluster-naming-and-shape-conventions) (4), [DI composition](triaged/cross-cutting.md#cluster-di-composition) (3) |

Each file ends with an appendix of **candidate issues**: one line each, for things that are either too small to be a
finding or that need a decision before they can be scoped. They carry no direction and no size, because deciding that
is the point of reviewing them.

## Coverage register

What the epic's existing sub-issues already own. A finding in this review must be distinct from every row here; where
it is adjacent to one, it says so.

### Required scope

| Issue                                                     | Title                                                     | Area it owns                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) | Migrate GLSP to ESM and Inversify 8                       | Module format, package entry points, Inversify 6→8, decorator metadata, build scripts                                                                                |
| [#1741](https://github.com/eclipse-glsp/glsp/issues/1741) | Extend initialization with typed server capabilities      | Typed capability objects in `InitializeResult` / `InitializeClientSessionParameters`; connection- vs session-scoped capabilities                                     |
| [#1742](https://github.com/eclipse-glsp/glsp/issues/1742) | Rework feature module configuration                       | `DEFAULT_MODULES` eager imports, `ContainerConfiguration` identity-based add/remove/replace, stable feature IDs, lazy module factories                               |
| [#1743](https://github.com/eclipse-glsp/glsp/issues/1743) | Define GLSP protocol compatibility rules                  | Protocol semantic version, one authoritative value, replacing the exact-match check in both servers                                                                  |
| [#1746](https://github.com/eclipse-glsp/glsp/issues/1746) | Review experimental APIs for GLSP 3.0                     | Status decision for MCP protocol types, the `server-mcp` package, `StickyManhattanEdgeRouter`, the experimental shortcut manager                                     |
| [#1747](https://github.com/eclipse-glsp/glsp/issues/1747) | Remove deprecated APIs and compatibility workarounds      | Every `@deprecated` symbol and its removal cutoff: geometry aliases, legacy SVG export actions, `handleInitializeArgs`, `PromiseQueue`, `GEdge.is`, `ModuleContext` |
| [#1744](https://github.com/eclipse-glsp/glsp/issues/1744) | Identify GLSP 3.0 codebase cleanup tasks                  | The review mandate itself, which this document feeds                                                                                                                 |
| [#1745](https://github.com/eclipse-glsp/glsp/issues/1745) | Evaluate record-compatible Java actions                   | Java action hierarchy and transport-state design (Java-side)                                                                                                         |
| [#1748](https://github.com/eclipse-glsp/glsp/issues/1748) | Support structured values in protocol Args                | Widening `Args` beyond `JsonPrimitive`; Java `Map<String, String>` alignment                                                                                         |
| [#1749](https://github.com/eclipse-glsp/glsp/issues/1749) | Improve the tool API and implementation                   | `ChangeBoundsTool` decomposition, the `FeedbackMoveMouseListener`/`ChangeBoundsListener` split, tool-to-listener coupling, tool activation semantics, interaction-state coordination, and readonly enforcement (the former `CL-6`, `CL-19`, `CL-20`, `CL-22`) |
| [#1750](https://github.com/eclipse-glsp/glsp/issues/1750) | Simplify the client feedback lifecycle                    | One feedback-session API; `FeedbackEmitter` `submit`/`discard`/`revert`/`dispose`; replay after set-model and update-model; removing `BaseTool.registerFeedback`     |
| [#1752](https://github.com/eclipse-glsp/glsp/issues/1752) | Define localization across the GLSP protocol              | Locale negotiation, localizable message types, which framework messages are localized                                                                                |
| [#1753](https://github.com/eclipse-glsp/glsp/issues/1753) | Define structured protocol errors                         | Error object with stable code; `RejectAction` vs error `MessageAction`; typed client error                                                                           |
| [#1754](https://github.com/eclipse-glsp/glsp/issues/1754) | Remove or replace `dispatchAfterNextUpdate`               | `postUpdateQueue`, one-shot model-change API, test-double implementations                                                                                            |
| [#1583](https://github.com/eclipse-glsp/glsp/issues/1583) | Use consistent logging approach across all components     | `console.log` vs injectable `Logger`; pass-through logger for stateless functions                                                                                    |
| [#1406](https://github.com/eclipse-glsp/glsp/issues/1406) | Improve ELK Layouting feature (epic)                      | GModel↔ELK transformation, layout configuration granularity, applying results, ELK version updates                                                                   |
| [#1632](https://github.com/eclipse-glsp/glsp/issues/1632) | Improve error handling for failed operations (epic)       | Operation failure reaching the client; operations as request-response                                                                                                |
| [#1664](https://github.com/eclipse-glsp/glsp/issues/1664) | Align selected Sprotty feature gaps in GLSP (epic)        | Typed graph gaps, persisted semantic behaviour, client default/composition gaps vs Sprotty                                                                           |
| [#1251](https://github.com/eclipse-glsp/glsp/issues/1251) | Investigate client-server update cycle for large diagrams | GModel size and transfer cost on initial render                                                                                                                      |

### Optional and follow-up scope

| Issue                                                     | Title                                                                 | Area it owns                                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [#1400](https://github.com/eclipse-glsp/glsp/issues/1400) | Align interface usage and default implementation sync across services | Injecting interfaces over default classes; keeping interface and default implementation in sync                           |
| [#1470](https://github.com/eclipse-glsp/glsp/issues/1470) | Improve `EdgeCreationTool`                                            | Inconsistent feedback use in `mouseOver`/`updateEdgeFeedback`; dynamic type hints in `FeedbackEdgeEndMovingMouseListener` |
| [#1471](https://github.com/eclipse-glsp/glsp/issues/1471) | Hover feedback is not working when using the `EdgeCreationTool`       | `GLSPHoverMouseListener` disabling hover during edge creation                                                             |
| [#1342](https://github.com/eclipse-glsp/glsp/issues/1342) | Add contribution point for tool palette toolbar items                 | Hard-coded toolbar items in the tool palette UI extension                                                                 |
| [#1341](https://github.com/eclipse-glsp/glsp/issues/1341) | Only load module CSS stylesheets if the module itself is loaded       | Per-module stylesheet imports at module root level                                                                        |
| [#1751](https://github.com/eclipse-glsp/glsp/issues/1751) | Add characterization tests for GLSP 3.0 client refactors              | Tests for feedback replay, the post-update queue, `ChangeBoundsTool`, the edge-creation state machine                     |
| [#1755](https://github.com/eclipse-glsp/glsp/issues/1755) | Measure GLSP client work on large diagrams                            | Measuring type-hint replay, hidden bounds processing, no-overlap checks, helper lines, move initialization                |
| [#1183](https://github.com/eclipse-glsp/glsp/issues/1183) | Adapt workflow example to be based on a real source model             | Workflow example moving off `direct-gmodel`                                                                               |
| [#1711](https://github.com/eclipse-glsp/glsp/issues/1711) | Introduce a `gmodel-demo` (`.gm`) example language                    | A second minimal example language for feature/render conformance                                                          |

## Finding index

**90 findings**, plus 140 candidate issues in the per-component appendices. Every finding is anchored to a
`file:line` that was read, and every finding in this document was re-verified against the source after the sweep that
produced it.

A **candidate issue** is not a finding. It is either too small to warrant one, or it needs a decision before it can be
scoped. Two rules keep the appendices free of duplicates: an observation that turned out to belong to a finding was
folded into that finding, and an observation that spans more than one package is listed only in
[cross-cutting.md](triaged/cross-cutting.md#appendix-candidate-issues).

Changes since the first pass, from reviewing the findings themselves:

- **Withdrawn.** The MCP demo's hand-coded protocol handling, the previous `EX-1`. The demo is `private: true` and
  never published, and a demo hardcoding which action kinds it handles is reasonable. One candidate issue remains,
  about the stale protocol version constant.
- **Withdrawn.** Request/response pairing as prose rather than types, the previous `PROT-1`. The whole model-load
  exchange is inherited from `sprotty-protocol`, and Sprotty's own server runs it without a latch, so the protocol
  shape is coherent; what is left is GLSP's server implementation, which is [SRV-16](triaged/server.md). Reason recorded in
  [protocol.md](triaged/protocol.md#withdrawn).
- **Withdrawn.** Operations as unacknowledged notifications, the previous `PROT-7`. [#1632](https://github.com/eclipse-glsp/glsp/issues/1632)
  owns it, including the success-response path this review had claimed as the part the epic did not cover. Reason
  recorded in [protocol.md](triaged/protocol.md#withdrawn).
- **Withdrawn.** Action kinds as a flat, unnamespaced string space, the previous `PROT-5`. Its premise, that the space
  had already collided, does not hold: all 16 kinds GLSP shares with Sprotty are deliberate extensions of the Sprotty
  action of that kind, and the one genuine divergence was resolved by renaming to `'glspUndo'`/`'glspRedo'`. A prefix
  convention across 65 wire values would be governance against a failure that has not happened. Reason recorded in
  [protocol.md](triaged/protocol.md#withdrawn).
- **Rewritten.** `PROT-9` first proposed that the client declare its receivable kinds explicitly instead of deriving
  them from handler registration. That was wrong. The derivation is the design, and it is what lets an adopter add a
  server-side handler for a client-local kind and have the handshake follow. What survives is narrower and is now the
  finding: nothing distinguishes an action that *must* stay client-side, such as feedback, from one that merely
  happens to be client-local today.
- **Withdrawn.** Undeclared dev tooling in package scripts, the previous `TOOL-3`. pnpm puts the workspace root's
  `node_modules/.bin` on `PATH` for every package script, so a root-level tooling dependency is the intended pattern,
  not a hoisting accident. Reason recorded in [tooling.md](triaged/tooling.md#withdrawn).
- **Withdrawn.** Handler and `G*` names meaning different things per side, the previous `X-4`. One contract and one
  registry per side, and one `GModelSchema` implementation per side, is the design. Reason recorded in
  [cross-cutting.md](triaged/cross-cutting.md#withdrawn).
- **Withdrawn.** No coordination between two sessions on one source model, the previous `SRV-19`. Not pursued for
  3.0. Recorded in [server.md](triaged/server.md#withdrawn).
- **Withdrawn.** `@eclipse-glsp/server` re-exporting protocol and graph, the previous `SRV-1`. Deliberate: adopters
  should need one package, and GLSP packages release in lockstep, so a protocol break is already a server break.
  Reason recorded in [server.md](triaged/server.md#withdrawn).
- **Withdrawn.** Accessibility features existing twice, the previous `CL-34`. The accessibility API is experimental
  and due for a rework outside the 3.0 effort. Reason recorded in [client.md](triaged/client.md#withdrawn-and-folded).
- **Withdrawn.** `initializeDiagramContainer` without a counterpart, the previous `CL-23`. The integrations tear
  containers down with `container.unload()`, which runs `@preDestroy`; the standalone example never needs to because
  its container lives as long as the app. Reason recorded in [client.md](triaged/client.md#withdrawn-and-folded).
- **Withdrawn.** `ExternalMarkerManager` as an unbound extension point, the previous `CL-8`. It is bound by the Theia
  integration, which this review does not read, and the class's own TSDoc says so. One candidate issue remains, about
  `languageLabel` being declared non-optional and assigned only downstream. Reason recorded in
  [client.md](triaged/client.md#withdrawn-and-folded).
- **Folded into an existing issue.** Four client findings went into
  [#1749](https://github.com/eclipse-glsp/glsp/issues/1749), which was rescoped from splitting `ChangeBoundsTool` to
  improving the tool API and implementation generally: `CL-6` (tool-to-listener coupling), `CL-19` (activation
  disables every default tool), `CL-20` (coordination by sniffing the action stream) and `CL-22` (readonly enforced
  only by the tool manager). Reasons recorded in [client.md](triaged/client.md#withdrawn-and-folded).
- **Withdrawn.** `configureActionHandler` cannot relate a kind to its handler, the previous `CL-4`. There is no
  one-to-one relation to express: 13 of the 43 distinct handlers in the client are registered for more than one kind,
  one of them for six. Typing it would force a hand-maintained union on exactly the handlers that are kind-agnostic by
  design. Reason recorded in [client.md](triaged/client.md#withdrawn-and-folded).
- **Withdrawn.** A container from `initializeDiagramContainer` renders nothing, the previous `CL-3`. Registering the
  default views through a function rather than a module is deliberate: a module would load every default for everyone,
  and a binding loaded by a module can be overridden but not removed, so the choice of which defaults to take would
  disappear. One candidate issue remains, about `baseViewModule` being dead but public. Reason recorded in
  [client.md](triaged/client.md#withdrawn-and-folded).
- **Withdrawn.** Package entry points as stub files and a non-standard `browser` field, the previous `TOOL-2`.
  [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) owns it: moving to ESM forces real `exports`, so the
  entry-point map is not a decision that can be sequenced separately, and that issue already lists defining `exports`
  and replacing the CommonJS forwarding files. Two specifics it does not name are carried in the withdrawal note.
  Reason recorded in [tooling.md](triaged/tooling.md#withdrawn).
- **Added.** The current [EX-1](triaged/examples.md), where `workflow-standalone` and `workflow-server` use the same
  `node`/`browser` directory names and `package.json` fields for opposite distinctions. This was a candidate issue
  about naming until it turned out to also mis-declare the package's entry points.
- **Added.** [X-9 to X-13](triaged/cross-cutting.md#typescript-idiom--configuration), a TypeScript language and configuration
  pass that the original lenses did not cover: enums, namespaces, and the three compiler-setting decisions that shape
  every package.
- **De-duplicated.** Ten candidate issues that restated a finding or another candidate issue were removed or folded
  into the entry that owns them.

| Component                            | Findings | Candidate issues |
| ------------------------------------ | -------- | ---------------- |
| [Client](triaged/client.md)                  | 27       | 71               |
| [Server](triaged/server.md)                  | 28       | 37               |
| [Protocol](triaged/protocol.md) *(triaged)* | 17       | 20               |
| [Cross-cutting](triaged/cross-cutting.md)    | 13       | 5                |
| [E2E](triaged/e2e.md) *(triaged)*    | 3        | none             |
| [Build, lint and packaging](triaged/tooling.md) *(triaged)* | 1 | 3          |
| [Examples](triaged/examples.md) *(triaged)* | 1        | 4                |

### Defects verified in passing

Not a priority judgement. It is the subset where the code does not do what it says, so triage can
separate "decide what this should be" from "this is broken now":

| Finding                       | What breaks                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| [SRV-6](triaged/server.md)            | `ActionHandler.priority` ordering never takes effect (`??`/`-` precedence)            |
| [SRV-7](triaged/server.md)            | `GModelOperationHandler`'s `injectable();` is missing its `@`                         |
| [SRV-9](triaged/server.md)            | `layout-elk`'s documented label/port override points discard their result             |
| [SRV-8](triaged/server.md)            | `GlspElkLayoutEngine.logger` is undefined; the warning path throws                    |
| [SRV-23](triaged/server.md)           | Every tool-palette item is emitted with the id `palette-item0`                        |
| [CL-2](triaged/client.md)             | Marker-navigator context menu entries never appear (shadow symbol)                    |
| [PROT-8](triaged/protocol.md)         | `BringToFrontAction.is` is declared but never assigned, so it throws at runtime       |
| [PROT-17](triaged/protocol.md)        | `LazyInjector` returns a single instance typed as an array, and caches misses forever |
| [server appendix](triaged/server.md)  | `PasteOperationHandler.filterElements` discards its own filter                        |
| [client appendix](triaged/client.md)  | `SetEdgeTargetSelectionAction.is` can never hold; its handler is dead                 |
| [client appendix](triaged/client.md)  | A stray `rank: number;` is spliced into a licence header; `headers:check` misses it    |

## Finding id mapping

This document was originally filed by review lens (`A1` to `A7`), which intermixed components. The findings are
unchanged; only their file and id moved. Ids within a range map in order.

| Previous               | Now                     | Why                                                    |
| ---------------------- | ----------------------- | ------------------------------------------------------ |
| A1-1 … A1-15           | CL-1 … CL-15            | client public API                                      |
| A6-1 … A6-16           | CL-16 … CL-31           | client runtime                                         |
| A3-2, A3-8, A3-10      | CL-32, CL-33, CL-34     | client DI; CL-34 withdrawn                             |
| A5-7, A5-9             | CL-35, CL-36            | client layering                                        |
| A2-2 … A2-15           | SRV-1 … SRV-14          | server public API; SRV-1 withdrawn                     |
| A7-1 … A7-9            | SRV-15 … SRV-23         | server runtime; SRV-19 withdrawn                       |
| A3-4, A3-5, A3-6, A3-7, A3-12 | SRV-24 … SRV-28  | server DI                                              |
| A5-2, A5-10            | SRV-29, SRV-30          | server layering                                        |
| A4-1 … A4-15           | PROT-1 … PROT-15        | wire contract; PROT-1, PROT-5 and PROT-7 withdrawn, leaving gaps |
| A2-1                   | PROT-16                 | the `lib/di` entry point is the protocol package's     |
| A3-3                   | PROT-17                 | `LazyInjector` is protocol code                        |
| A5-3, A5-4, A5-8       | PROT-18, PROT-19, PROT-20 | protocol package shape and transports                |
| A3-1                   | X-1                     | client + server + protocol                             |
| A3-9                   | X-2                     | protocol mechanism, client and example consequences    |
| A3-11                  | X-3                     | client + server                                        |
| A7-10 … A7-14          | X-4 … X-8               | naming and convention; X-4 withdrawn                   |
| A5-5, A5-11, A5-12     | E2E-1, E2E-2, E2E-3     | e2e                                                    |
| A5-1, A5-6             | TOOL-1, TOOL-2          | lint, packaging; TOOL-2 withdrawn to #1740             |
| A5-14                  | withdrawn                | see [tooling.md](triaged/tooling.md#withdrawn)                |
| A5-13                  | withdrawn                | now one line in the [examples appendix](triaged/examples.md)  |

The lenses that produced the findings were: public API (client; server and protocol), DI and module architecture,
protocol design, layering & dependency direction, client runtime model, and server runtime model · naming
consistency. They are recorded here only to explain the mapping. The lens is no longer a unit of organization.

## Note on the repository's own documentation

`AGENTS.md` is eight lines and there is no `docs/` directory in git history. There is no architecture document, no ADRs, no
product specs. Several findings are therefore "the intended rule is unstated", not "the rule is violated": the Sprotty
seam, the `common`/`node`/`browser` split ([SRV-29](triaged/server.md)) and the layering rules ([TOOL-1](triaged/tooling.md)) exist
only as lint configuration, and that configuration currently reports them as warnings. Whatever 3.0 decides, writing
the intended layering down is a prerequisite for enforcing it.

This turned out to be expensive enough to be a finding in its own right: [X-14](triaged/cross-cutting.md#x-14--the-decisions-that-shape-this-codebase-are-not-written-down-and-this-review-kept-mistaking-them-for-defects)
records the decisions the review had to reverse-engineer, including three findings that were withdrawn or rewritten
once a constraint finally surfaced.
