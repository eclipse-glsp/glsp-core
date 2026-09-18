# GLSP 3.0 Codebase Review

A read-only architecture and design review of `glsp-core`, run ahead of the GLSP 3.0 release
([eclipse-glsp/glsp#1738](https://github.com/eclipse-glsp/glsp/issues/1738)).

Its purpose is to surface **additional** improvement candidates that the epic's existing sub-issues do not already
cover, while a major-version boundary makes any change possible. It is an investigation: no code changes, and no
issues are filed from it until the findings have been reviewed.

## Scope

**In scope.** `glsp-core` as it stands today — the diagram client, the Node server, the shared protocol, and the
in-tree examples.

**Out of scope.**

- `glsp-server-java`. Protocol findings note where a Java-side change would be required, but the Java code was not
  reviewed.
- The downstream integration repositories (Theia, VS Code). Adopter impact in this document is an **estimate**, not
  a measurement — no call sites were counted.
- The 28 existing sub-issues of the epic. They may receive an added note here, and a finding may flag a conflict
  with one of their proposals, but none of them is re-scoped by this review.
- ESM and Inversify 8 ([#1740](https://github.com/eclipse-glsp/glsp/issues/1740)) are treated as a _technical_
  migration, not an architectural one. Findings note where they interact; nothing here is premised on their outcome.

**Not covered by the lenses below.** Test architecture and build/dev tooling were deliberately excluded: neither
requires a major-version boundary, so spending the 3.0 window on them spends a scarce resource on a cheap problem.

## Lenses

|     | Lens                                                      | Surface                                         | Findings                               |
| --- | --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| A1  | Public API surface & extension points — client            | `packages/client/*`                             | [api-client.md](api-client.md)         |
| A2  | Public API surface & extension points — server & protocol | `packages/server/*`, `packages/common/protocol` | [api-server.md](api-server.md)         |
| A3  | DI & module architecture                                  | whole repo                                      | [di.md](di.md)                         |
| A4  | Protocol design                                           | `packages/common/protocol` + consumers          | [protocol.md](protocol.md)             |
| A5  | Layering & dependency direction                           | whole repo                                      | [layering.md](layering.md)             |
| A6  | Client runtime model                                      | client tools, feedback, commands, update cycle  | [client-runtime.md](client-runtime.md) |
| A7  | Server runtime model · naming & concept consistency       | server, cross-cutting                           | [server-runtime.md](server-runtime.md) |

A1–A6 are first-class; A7 is second-class — recorded, not dwelt on.

## How to read a finding

Each finding carries: a **location** (`file:line`), **what's wrong** in one sentence, a non-binding **direction**,
a rough **size** (S/M/L), and a cross-reference to an existing sub-issue where one is adjacent.

There is deliberately **no severity, priority, or breaking/non-breaking classification**. Every finding is
something that can be addressed; deciding which ones are worth addressing for 3.0 is the review's job, not the
document's.

Findings below each lens's reporting cap are listed one line each in that file's appendix, so nothing is lost.

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
| [#1747](https://github.com/eclipse-glsp/glsp/issues/1747) | Remove deprecated APIs and compatibility workarounds      | Every `@deprecated` symbol and its removal cutoff — geometry aliases, legacy SVG export actions, `handleInitializeArgs`, `PromiseQueue`, `GEdge.is`, `ModuleContext` |
| [#1744](https://github.com/eclipse-glsp/glsp/issues/1744) | Identify GLSP 3.0 codebase cleanup tasks                  | The review mandate itself — this document feeds it                                                                                                                   |
| [#1745](https://github.com/eclipse-glsp/glsp/issues/1745) | Evaluate record-compatible Java actions                   | Java action hierarchy and transport-state design (Java-side)                                                                                                         |
| [#1748](https://github.com/eclipse-glsp/glsp/issues/1748) | Support structured values in protocol Args                | Widening `Args` beyond `JsonPrimitive`; Java `Map<String, String>` alignment                                                                                         |
| [#1749](https://github.com/eclipse-glsp/glsp/issues/1749) | Split move and resize into independent tools              | `ChangeBoundsTool` decomposition, `FeedbackMoveMouseListener` / `ChangeBoundsListener` split                                                                         |
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

**101 findings**, plus roughly 150 further one-line observations in the per-lens appendices. Every finding is anchored
to a `file:line` that was read, and every finding in this document was re-verified against the source after the sweep
that produced it. Where two lenses found the same thing, it is recorded once and cross-referenced from the other — the
"Recorded elsewhere" section in each file lists those.

| Lens                                                | Findings | Appendix items |
| --------------------------------------------------- | -------- | -------------- |
| [A1 — Public API, client](api-client.md)            | 15       | 30             |
| [A2 — Public API, server & protocol](api-server.md) | 15       | 27             |
| [A3 — DI & module architecture](di.md)              | 12       | 19             |
| [A4 — Protocol design](protocol.md)                 | 15       | 16             |
| [A5 — Layering & dependency direction](layering.md) | 14       | 13             |
| [A6 — Client runtime model](client-runtime.md)      | 16       | 31             |
| [A7 — Server runtime · naming](server-runtime.md)   | 14       | 15             |

### Cross-cutting themes

Findings that recur across lenses, and are likely to be worth deciding together rather than one issue at a time:

- **Re-export surfaces.** `@eclipse-glsp/client` re-exports all of Sprotty (A1-1), `@eclipse-glsp/server` re-exports all
  of protocol and graph (A2-2), protocol re-exports whole Sprotty modules (A4 appendix), and the shared DI layer is
  reachable only via a `lib/` build path (A2-1). No package has an `exports` map (A5-6).
- **Lifecycle and disposal.** Client diagram containers are never torn down, so 16 `@preDestroy` hooks never run and
  each closed diagram leaks a server session (A6-8); server sessions dispose one object and leak their container
  (A2-14, A7-1); the connection level uses the opposite convention (A3).
- **Contribution points.** Five override policies across five registries (A1-11), three incompatible multi-binding
  mechanisms (A3-5), server handlers contributable only by subclassing (A2-3), and silent module-order dependence
  (A3-9).
- **Untyped escape hatches.** `Args` carries the diagram's identity (A4-3), `ModelState` is a string-keyed `any` bag
  (A7-7), `messages` intersects `Record<string, any>` (A1-13), and direction/routing is a mutated `__` property on the
  payload (A4-4, A6-13).
- **Two implementations of one concept.** Keyboard vs mouse change-bounds (A6-6), client vs server DI framework
  (A3-1), four copy-pasted edge routers (A1-12), accessibility features as both modules and functions (A3-10).
- **Truthiness instead of definedness.** The same bug shape in `ArgsUtil` (A2 appendix), `argument-utils` (A1
  appendix), `GEdge.addRoutingPoint` and `GIssueMarker` (A2-11) — each silently discards a valid `0` or `false`.

### Defects verified in passing

Not a priority judgement — simply the subset where the code demonstrably does not do what it says, so triage can
separate "decide what this should be" from "this is broken now":

| Finding                          | What breaks                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| [A2-7](api-server.md)            | `ActionHandler.priority` ordering never takes effect (`??`/`-` precedence)            |
| [A2-8](api-server.md)            | `GModelOperationHandler`'s `injectable();` is missing its `@`                         |
| [A2-10](api-server.md)           | `layout-elk`'s documented label/port override points discard their result             |
| [A2-9](api-server.md)            | `GlspElkLayoutEngine.logger` is undefined; the warning path throws                    |
| [A1-2](api-client.md)            | Marker-navigator context menu entries never appear (shadow symbol)                    |
| [A4-8](protocol.md)              | `BringToFrontAction.is` is declared but never assigned — throws at runtime            |
| [A3-3](di.md)                    | `LazyInjector` returns a single instance typed as an array, and caches misses forever |
| [A6-8](client-runtime.md)        | Closing a diagram leaks the server session; 16 `@preDestroy` hooks are unreachable    |
| [A7-9](server-runtime.md)        | Every tool-palette item is emitted with the id `palette-item0`                        |
| [A7 appendix](server-runtime.md) | `PasteOperationHandler.filterElements` discards its own filter                        |
| [A6 appendix](client-runtime.md) | `SetEdgeTargetSelectionAction.is` can never hold; its handler is dead                 |
| [A6 appendix](client-runtime.md) | A stray `rank: number;` is spliced into a licence header; `headers:check` misses it   |

### Note on the repository's own documentation

`AGENTS.md` is eight lines and there is no `docs/` directory in git history — no architecture document, no ADRs, no
product specs. Several findings are therefore "the intended rule is unstated", not "the rule is violated": the Sprotty
seam, the `common`/`node`/`browser` split (A5-2) and the layering rules (A5-1) exist only as lint configuration, and
that configuration currently reports them as warnings. Whatever 3.0 decides, writing the intended layering down is a
prerequisite for enforcing it.
