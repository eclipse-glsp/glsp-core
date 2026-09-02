# Eclipse GLSP Changelog

Entries are grouped by component (Protocol, Client, Server, Dev Packages) per release.

## v2.9.0 - active

### Protocol

#### Changes

#### Potentially Breaking Changes

### Client

#### Changes

#### Potentially Breaking Changes

### Server

#### Changes

#### Potentially Breaking Changes

### Dev Packages

#### Changes

#### Potentially Breaking Changes

---

> **Note:** All releases below predate the consolidation into the `glsp-core` monorepo.
> Back then, the components were developed and released in separate repositories:
> [`glsp-client`](https://github.com/eclipse-glsp/glsp-client) (Client),
> [`glsp-server-node`](https://github.com/eclipse-glsp/glsp-server-node) (Server) and
> [`glsp`](https://github.com/eclipse-glsp/glsp) (Dev Packages).
> Their changelogs have been merged here; release and pull request links still point to the original repositories.
> The protocol was part of `glsp-client`, so pre-consolidation protocol changes are recorded under Client as `[protocol]` entries.

---

## v2.8.0 - 28/08/2026

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.8.0)

#### Changes

- [diagram] Fix scrollbar computation of the GLSP projection view for diagrams that do not start at the origin [#504](https://github.com/eclipse-glsp/glsp-client/pull/504)
- [diagram] Add the `pageToCssPosition` utility and use it to place UI extensions relative to their positioning context, so overlays are positioned correctly when the diagram container does not sit at the page origin [#504](https://github.com/eclipse-glsp/glsp-client/pull/504)
- [build] Migrate the build from yarn and lerna to pnpm workspaces [#517](https://github.com/eclipse-glsp/glsp-client/pull/517)
- [protocol] Introduce a shared `uuid` utility, so consuming packages no longer depend on their own `uuid` version [#519](https://github.com/eclipse-glsp/glsp-client/pull/519)
    - The ESLint configuration now restricts direct `uuid` imports in favor of the new helper
- [build] Migrate the test framework from Mocha to Vitest [#522](https://github.com/eclipse-glsp/glsp-client/pull/522)
- [layout] Fix bounds computation error after diagram export [#525](https://github.com/eclipse-glsp/glsp-client/pull/525)
- [layout] Keep client-side feedback elements, such as validation markers, out of the bounds reported to the server [#531](https://github.com/eclipse-glsp/glsp-client/pull/531)
    - Adds the `enableFeatures` model utility to enable model features on a single element without modifying the feature set shared by its element type

#### Potentially Breaking Changes

- [websocket] Fix `GLSPWebSocketProvider` not retrying when it is launched before the server is available [#504](https://github.com/eclipse-glsp/glsp-client/pull/504)
    - Reconnect attempts are now also scheduled for a connection that was never established, so adopters that relied on retries only kicking in after a first successful connection may observe additional connect attempts

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.8.0)

#### Changes

- [deps] Switch bundling from webpack to esbuild [#142](https://github.com/eclipse-glsp/glsp-server-node/pull/142)
- [deps] Migrate the build from yarn and lerna to pnpm workspaces [#144](https://github.com/eclipse-glsp/glsp-server-node/pull/144)
- [launch] Expose the address a launcher bound to via `listening` and `port` on `JsonRpcGLSPServerLauncher`, so an embedder no longer has to parse the startup message to learn an OS-assigned port [#150](https://github.com/eclipse-glsp/glsp-server-node/pull/150)
- [launch] Add an `onConnection` event to `SocketServerLauncher` and `WebSocketServerLauncher`, so an embedder can observe accepted connections without reaching for the protected server field [#150](https://github.com/eclipse-glsp/glsp-server-node/pull/150)
    - the web socket event carries the upgrade request next to the socket, which is the only place its headers and query are still available
- [launch] Release the server socket again when a restarted launcher is shut down [#150](https://github.com/eclipse-glsp/glsp-server-node/pull/150)
    - `WebSocketServerLauncher` now also closes the HTTP server it mounts on, which `ws` leaves listening because it did not create it
- [mcp] Return results that satisfy the declared output schema, so a `create-edges` dry run returns its verdicts instead of an output-validation error [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
- [mcp] Stop reporting success for work that was not done [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
    - `save-model` writes to an explicit `fileUri` even when the command stack is clean, instead of skipping a save-as
    - `undo` and `redo` report how many commands they applied, not how many were requested
    - `modify-nodes` and `modify-edges` report an error for entries that request no change, instead of counting them as modified
- [mcp] Reject unknown element ids in `validate-diagram` and `set-view`, which previously dropped them and returned an empty, clean-looking result [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
- [mcp] Keep tools out of the MCP catalog when no diagram type supports them, so `layout` is no longer advertised without a bound `LayoutEngine` [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
    - the new `isSupportedByDiagramType()` hook on the diagram tool and resource bases covers statically bound dependencies; `canRegister()` keeps gating capabilities of the connected GLSP client
- [mcp] Align tool schemas and descriptions with what the tools actually accept and apply [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
    - `set-selection` accepts the documented empty-array form for clearing the selection, and `undo` / `redo` require integer counts
    - `modify-nodes` positions are parent-relative and `create-nodes` positions absolute, matching the dispatched operations
    - the `create-*` tools echo the created element when its type differs from the requested `elementTypeId`, instead of reporting a creation failure

#### Potentially Breaking Changes

- [elk] Replace the no-op ELK factory in web worker contexts with a working in-process implementation [#141](https://github.com/eclipse-glsp/glsp-server-node/pull/141)
    - `elkLayoutModule` was effectively a no-op in the browser and now actually performs layout, so adopters that relied on that behavior have to adapt accordingly
- [layout] Keep applying computed bounds when an individual entry cannot be applied [#149](https://github.com/eclipse-glsp/glsp-server-node/pull/149)
    - `applyRoute` now returns `GEdge | undefined` instead of `GEdge`
    - `applyElementAndBounds`, `applyAlignment` and `applyRoute` no longer throw for an element the index cannot resolve, they report it as not applied. `applyRoutingPoints` stays strict.
- [launch] Launchers register what `shutdown` has to release in the new `GLSPServerLauncher.registerDisposables` hook, called once per launch, rather than in their constructor [#150](https://github.com/eclipse-glsp/glsp-server-node/pull/150)
    - A custom launcher that pushes into `toDispose` from its constructor keeps compiling but loses that cleanup after the first `shutdown`, because `dispose` empties the collection. Move those registrations into an override of `registerDisposables`.
- [mcp] The MCP tool handler bases take an optional output type parameter, e.g. `AbstractMcpDiagramToolHandler<I, O>`, bound to the handler's declared `outputSchema` [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
    - The parameter defaults, so a handler without an `outputSchema` is unaffected. A subclass that passes `success()` a payload not matching the overridden handler's output schema now fails to compile, instead of producing an error result at call time.
- [mcp] `modify-nodes` rejects `position` / `size` for elements that are not a `GNode`, which core's bounds handler silently ignored while the tool reported success [#152](https://github.com/eclipse-glsp/glsp-server-node/pull/152)
    - Adopters who bind a bounds handler covering more element kinds override the guard in `ModifyNodesMcpToolHandler`.

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.8.0)

#### Changes

- [cli] Fix incorrect path resolution in the `repo` commands [#1690](https://github.com/eclipse-glsp/glsp/pull/1690)
- [cli] Improve `checkHeaders --type changes` to diff against the default branch, so the checked files match a pull request's changed files [#1694](https://github.com/eclipse-glsp/glsp/pull/1694)
- [cli] Make the CLI commands package-manager aware and add `releng publish` in place of `lerna publish` [#1697](https://github.com/eclipse-glsp/glsp/pull/1697)
- [cli] Fix the pnpm path resolution of the `updateNext` command [#1698](https://github.com/eclipse-glsp/glsp/pull/1698)
- [cli] Rework `repo link` and `repo unlink` onto pnpm `link:` overrides and build each linked repo, so the overrides resolve to compiled output [#1703](https://github.com/eclipse-glsp/glsp/pull/1703)
- [cli] Add an interactive option to the `releng publish` command [#1706](https://github.com/eclipse-glsp/glsp/pull/1706)
- [cli] Fix change detection of the `checkHeaders` command [#1707](https://github.com/eclipse-glsp/glsp/pull/1707)
- [eslint-config] Re-enable the core `no-unused-expressions` rule and drop `eslint-plugin-chai-friendly`, which is obsolete now that assertions are function calls [#1708](https://github.com/eclipse-glsp/glsp/pull/1708)

#### Potentially Breaking Changes

- [deps] Update the shared dev dependencies to their current major versions [#1701](https://github.com/eclipse-glsp/glsp/pull/1701)
    - ESLint 9.x to 10.x, along with `@stylistic` 2.x to 5.x, `globals` 15.x to 17.x, and `eslint-plugin-import-x` floored to >=4.16.2. The `preserve-caught-error` rule, new in ESLint 10's recommended set, is disabled.
    - Prettier 2.x to 3.x, which reformats markdown list markers to a single space
    - sinon 15.x to 22.x, rimraf 5.x to 6.x, esbuild 0.25 to 0.28, and reflect-metadata 0.1 to 0.2
- [node] Raise the minimum Node version to `^22.13.0 || >=24`, required by ESLint 10 [#1701](https://github.com/eclipse-glsp/glsp/pull/1701)
- [ts-config] Migrate the shared `target` and `lib` to ES2023 [#1702](https://github.com/eclipse-glsp/glsp/pull/1702)
    - `useDefineForClassFields` is set to `false` to preserve property injection
- [config] Migrate the shared test stack from Mocha, nyc, chai and sinon to Vitest [#1705](https://github.com/eclipse-glsp/glsp/pull/1705)
    - New `@eclipse-glsp/vitest-config` package providing a ready-to-use shared flat config; the obsolete `mocha-config` and `nyc-config` packages are dropped
    - `config-test` now bundles the Vitest config and test dependencies in place of Mocha and nyc
    - The bespoke `coverage-report` CLI command is removed in favor of `vitest --coverage`

## v2.7.0 - 01/06/2026

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.7.0)

#### Changes

- [build] Switch to ESLint 9.x [#470](https://github.com/eclipse-glsp/glsp-client/pull/470)
- [diagram] Fix AbstractUIExtension error message [#469](https://github.com/eclipse-glsp/glsp-client/pull/469)
- [diagram] Fix edit label UI not resizing on graph zoom [#455](https://github.com/eclipse-glsp/glsp-client/pull/455)
- [mcp] Add Model Context Protocol client- and protocol-side support, paired with `@eclipse-glsp/server-mcp` [#456](https://github.com/eclipse-glsp/glsp-client/pull/456)
    - New optional `mcpServer?: McpServerConfiguration` field on `InitializeParameters` opts the GLSP server into starting an MCP server; the response carries an `McpServerResult` descriptor with the announced URL.
    - Configuration is split into init- and deploy-controllable parts (`McpServerInitOptions` / `McpServerDeployOptions`) so security-relevant fields stay under deployment control.
- [export] Generic, format-agnostic export pipeline [#456](https://github.com/eclipse-glsp/glsp-client/pull/456)
    - New `RequestExportAction` / `ExportResultAction` pair coexisting with the legacy `RequestExportSvgAction` / `ExportSvgAction` flow under strict separation.
    - Pluggable `DiagramExporter` registry with default SVG and PNG strategies and a shared post-processing step. PNG export is a new built-in capability.
    - Adopters register a custom `DiagramExporter` to add formats or override the defaults.
- [protocol] Move `OriginViewportAction` from the client package to `@eclipse-glsp/protocol` so it can be dispatched server-side as well. The action is still re-exported transitively via `@eclipse-glsp/sprotty`, so existing client-side imports continue to work. [#456](https://github.com/eclipse-glsp/glsp-client/pull/456)
- [protocol] Add bidirectional request/response protocol support for server-initiated queries [#480](https://github.com/eclipse-glsp/glsp-client/pull/480)
- [routing] Add sticky Manhattan edge router and rounded-corner edge view [#486](https://github.com/eclipse-glsp/glsp-client/pull/486)
- [example] Add standalone browser example running the GLSP workflow server as a web worker [#490](https://github.com/eclipse-glsp/glsp-client/pull/490) [#500](https://github.com/eclipse-glsp/glsp-client/pull/500)
- [example] Update start scripts to support external bundles and configurable ports [#506](https://github.com/eclipse-glsp/glsp-client/pull/506)
- [api] Restore parallel-start dispatch for async action handlers [#507](https://github.com/eclipse-glsp/glsp-client/pull/507)
- [mcp] Make MCP server startup configurable via URL parameters [#508](https://github.com/eclipse-glsp/glsp-client/pull/508)

#### Potentially Breaking Changes

- [node] Update minimum requirements for Node to >=22 [#476](https://github.com/eclipse-glsp/glsp-client/pull/476)
- [protocol] Remove direct dependency on lodash [#495](https://github.com/eclipse-glsp/glsp-client/pull/495)
    - Base GLSP packages no longer depend on lodash. Adopters that relied on lodash being available transitively must either switch to the new GLSP utility functions or add lodash as a direct dependency.
- [protocol] `OriginViewportAction.is` now also requires the `animate` field (matching the shape of `CenterAction.is` and `FitToScreenAction.is`). Hand-rolled emitters that ship a bare `{kind: 'originViewport'}` will no longer pass the guard; use `OriginViewportAction.create()` (which defaults `animate: true`) or include `animate` explicitly. [#456](https://github.com/eclipse-glsp/glsp-client/pull/456)
- [protocol] `GLSPClient.shutdownServer()` now returns `MaybePromise<void>` instead of `void`. Pre-existing synchronous adopter implementations remain valid; callers that dispose the connection immediately after the shutdown signal MUST `await` the returned value to ensure the notification is flushed to the wire before the connection closes. [#456](https://github.com/eclipse-glsp/glsp-client/pull/456)

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.7.0)

#### Changes

- [mcp] Add support for Model Context Protocol (MCP) [#120](https://github.com/eclipse-glsp/glsp-server-node/pull/120)
- [mcp] Make MCP server browser-portable with a Web-standard Fetch API handler [#136](https://github.com/eclipse-glsp/glsp-server-node/pull/136)

#### Potentially Breaking Changes

- [node] Update minimum requirements for Node to >=22 [#128](https://github.com/eclipse-glsp/glsp-server-node/pull/128)
- [action] Add `request()` and `requestUntil()` to `ActionDispatcher` for server-to-client request/response support [#131](https://github.com/eclipse-glsp/glsp-server-node/pull/131)
    - Adopters with custom `ActionDispatcher` implementations need to add the new `request()` and `requestUntil()` methods

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.7.0)

#### Changes

- [eslint-config] Update ESLint configuration and dependencies to ESLint 9.x [#1638](https://github.com/eclipse-glsp/glsp/pull/1638)
- [cli] Fix a bug in `checkHeaders` where gitignored files were incorrectly included in the full header check [#1643](https://github.com/eclipse-glsp/glsp/pull/1643)
- [cli] Fix a bug in `checkHeaders` that caused errors in non-tty shell environments [#1644](https://github.com/eclipse-glsp/glsp/pull/1644)
- [cli] Introduce the `glsp repo` command group for managing multi-repo GLSP development workspaces [#1655](https://github.com/eclipse-glsp/glsp/pull/1655)
- [cli] Fix port override in start commands [#1679](https://github.com/eclipse-glsp/glsp/pull/1679)
- [cli] Enable passthrough arguments for start commands [#1680](https://github.com/eclipse-glsp/glsp/pull/1680)
- [cli] Add `--dry-run` option to start commands [#1683](https://github.com/eclipse-glsp/glsp/pull/1683)
- [cli] Use batch mode for CLI Maven commands to reduce console noise [#1684](https://github.com/eclipse-glsp/glsp/pull/1684)

#### Potentially Breaking Changes

- [node] Update minimum requirements for Node to >=22.x [#1644](https://github.com/eclipse-glsp/glsp/pull/1644)

## v2.6.0 - 09/02/2026

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.6.0)

#### Changes

- [diagram] Fix overflow-behavior of command-palette [#449](https://github.com/eclipse-glsp/glsp-client/pull/449)
- [i18n] Add missing translation messages for context menu labels [#450](https://github.com/eclipse-glsp/glsp-client/pull/450)
- [diagram] Fix bugs with the export SVG feature [#451](https://github.com/eclipse-glsp/glsp-client/pull/451)
- [diagram] Add support for nested nodes to `NoOverlapMovementRestrictor` [#452](https://github.com/eclipse-glsp/glsp-client/pull/452)
- [api] Add optional viewport information to `ComputedBoundsAction` [#460](https://github.com/eclipse-glsp/glsp-client/pull/460)
- [diagram] Update to codicon 0.0.44 -> new icons are available [#465](https://github.com/eclipse-glsp/glsp-client/pull/465)

#### Potentially Breaking Changes

- [api] Refactor menu item API [#450](https://github.com/eclipse-glsp/glsp-client/pull/450)
    - Ensure that `MenuItem` is serializable
        - Use boolean flags instead of functions
    - Use `ClientMenuItem` instead of `MenuItem` on client-side
- [api] Add support for asynchronous `ActionHandler` [#457](https://github.com/eclipse-glsp/glsp-client/pull/457)
    - Breaking changes in protected methods of `GlspActionDispatcher` (might affect adopter subclasses)

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.6.0)

_Released on 10/02/2026._

#### Changes

- [api] Extend model submission with optional layout information [#121](https://github.com/eclipse-glsp/glsp-server-node/pull/121)

#### Potentially Breaking Changes

- [api] Refactor MenuItem API [#116](https://github.com/eclipse-glsp/glsp-server-node/pull/116)
    - `isEnabled`, `isToggled` and `isVisible` are now serializable boolean flags instead of functions

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.6.0)

No changes.

## v2.5.0 - 07/09/2025

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.5.0)

#### Changes

- [diagram] Fix text selection issues in chrome [#425](https://github.com/eclipse-glsp/glsp-client/pull/425)
- [example] Fix render error for new categories [#426](https://github.com/eclipse-glsp/glsp-client/pull/426)
- [api] Introduce & use ProposalString utility type [#427](https://github.com/eclipse-glsp/glsp-client/pull/427)
- [i18n] Add missing localization message for marker popups [#428](https://github.com/eclipse-glsp/glsp-client/pull/428)
- [diagram] Add missing visibility check to `RoundedCornerNodeView` [#430](https://github.com/eclipse-glsp/glsp-client/pull/430)
- [layout] Fix a bug in the hGrab/vGrab calculation [#435](https://github.com/eclipse-glsp/glsp-client/pull/435)

#### Potentially Breaking Changes

- [protocol] Enrich `LayoutOperation` with additional optional client-side information (viewport) [#433](https://github.com/eclipse-glsp/glsp-client/pull/433) [#434](https://github.com/eclipse-glsp/glsp-client/pull/434/files)
    - To trigger a manual layout the new `TriggerLayoutAction` should be dispatched instead of a direct `LayoutOperation`
    - Dispatching of direct `LayoutOperation`s will still work, but the optional information will not be present
- [layout] Introduce order-agnostic layouts [#436](https://github.com/eclipse-glsp/glsp-client/pull/436/)
    - Introduce a flag for `ILayouts` to specify whether the layouting of children is independent of their semantic order in the model.
      The `BringToFrontCommand` respects this flag and only changes the ordering of order-agnostic layouts
    - `zorder` module now requires bounds module as we need the layout registry
- [diagram] Introduce viewport change event for `EditorContextService` [#438](https://github.com/eclipse-glsp/glsp-client/pull/438)
    - This change extracts the handling of model related changes into an dedicated `IModelChangeService` which is reused by the `EditorContextService`
    - The following changes to internal API might affect customizations of adopters:
        - `GLSPCommandStack`: 'notifyListener' method has been removed
        - `EditorContextService`:
            - Remove `_modelRoot` and `onModelRootChangedEmitter` properties. Corresponding getters now forward to the `IModelChangeService`
            - Remove `notifyModelRootChanged` method (Probably no side effect for adopters. Method was only callable from commandstack anyways)
- [node] Update minimum requirements for Node to >=20 [#439](https://github.com/eclipse-glsp/glsp-client/pull/439)

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.5.0)

#### Changes

- [api] Add layout operation as optional parameter to `LayoutEngine.layout` [#111](https://github.com/eclipse-glsp/glsp-server-node/pull/111)

#### Potentially Breaking Changes

- [layout] Updated GLSPElkLayoutEngine for elkjs > 0.10.1 [#109](https://github.com/eclipse-glsp/glsp-server-node/pull/109)
    - `GLSPElkLayoutEngine`: Replace usages of the deprecated and no longer supported `ELKPrimitiveEdge`. This might affect adopters that use a customization of this class
- [node] Update minimum requirements for Node to >=20 [#113](https://github.com/eclipse-glsp/glsp-server-node/pull/113)

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.5.0)

#### Changes

- [node] Dropped support for node 18 & update minimum requirements for Node to >=20.x [#1564](https://github.com/eclipse-glsp/glsp/pull/1564)
    - Minimum required TS version is now 5.x

## v2.4.0 - 04/04/2025

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.4.0)

#### Changes

- [diagram] Remove !important rules from default CSS [#412](https://github.com/eclipse-glsp/glsp-client/pull/412) [#413](https://github.com/eclipse-glsp/glsp-client/pull/413) [#414](https://github.com/eclipse-glsp/glsp-client/pull/414)
- [diagram] Update default styling for label texts to avoid unintended user selection [#415](https://github.com/eclipse-glsp/glsp-client/pull/415)
- [diagram] Fix behavior of `ContainerManager` to allow proper usage of type hints on root/graph level [#417](https://github.com/eclipse-glsp/glsp-client/pull/417)
- [diagram] Prevent unintended rendering of not-supported sprotty reconnect handles [#418](https://github.com/eclipse-glsp/glsp-client/pull/418)
- [diagram] Allow listening to selection changes in the `AutoCompleteWidget` [#420](https://github.com/eclipse-glsp/glsp-client/pull/420)
- [api] Introduce a lightweight adaptable message system (i18n) [#421](https://github.com/eclipse-glsp/glsp-client/pull/421)

#### Potentially Breaking Changes

- [diagram] Refactor a11y feature module and extract move,zoom,shortcut and resize features [#396](https://github.com/eclipse-glsp/glsp-client/pull/396)
    - The move, zoom, shortcut and resize features have been moved to their own modules. They are now enabled by default
    - For now the a11y module remains in experimental state and api breakages might occur in the future

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.4.0)

#### Changes

- [layout] Fix a bug regarding the application of routing point information in `ComputedBoundsActionHandler` [#103](https://github.com/eclipse-glsp/glsp-server-node/pull/103)
- [gmodel] Cancel pending progress reporters in `RequestModelActionHandler` if an error occurred [#104](https://github.com/eclipse-glsp/glsp-server-node/pull/104)
- [operation] Improve `OperationActionHandler` to ensure that a new model is only submitted after actual changes [#105](https://github.com/eclipse-glsp/glsp-server-node/pull/105)
- [server] Ensure correct log level logging for `ConsoleLogger` [#106](https://github.com/eclipse-glsp/glsp-server-node/pull/106)
- [server] Avoid configuration of winston logger if logging is disabled via options [#107](https://github.com/eclipse-glsp/glsp-server-node/pull/107)

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.4.0)

No changes.

## v2.3.0 - 23/12/2024

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.3.0)

#### Changes

- [protocol] Ensure that the `@eclipse-glsp/protocol` package has no default dependency to inversify [#384](https://github.com/eclipse-glsp/glsp-client/pull/384)[#387](https://github.com/eclipse-glsp/glsp-client/pull/387)
- [diagram] Ensure that `GLSPMousePositionTracker` correctly calculates the current position in diagram local coordinates [#391](https://github.com/eclipse-glsp/glsp-client/pull/391)
- [api] Align `ActionDispatcher` interface with `GLSPActionDispatcher` implementation. [#394](https://github.com/eclipse-glsp/glsp-client/pull/394)
    - Directly injecting the `GLSPActionDispatcher` is no longer necessary use `TYPES.IActionDispatcher`/`ActionDispatcher` instead
- [standalone] Adapt `copyPasteStandalone` module to ensure that copy/cut/paste listeners are scoped to the active diagram and don't trigger globally [#395](https://github.com/eclipse-glsp/glsp-client/pull/395)
- [diagram] Introduce `IMovementOptions` for the `ChangeBoundsTool` to allow configuration of movement behavior [#397](https://github.com/eclipse-glsp/glsp-client/pull/397) - Contributed on behalf of Axon Ivy AG
- [diagram] Fix a bug that prevented the `ChangeBoundsTool` from working correctly if the user moved outside of the diagram during an operation [#399](https://github.com/eclipse-glsp/glsp-client/pull/399) - Contributed on behalf of AxonIvy AG
- [api] Improve default `GLSPClient` implementation to be more robust when certain methods are invoked multiple times [#402](https://github.com/eclipse-glsp/glsp-client/pull/402)
- [diagram] Fix a bug in the uri handling of the `NavigationTargetResolver` [#403](https://github.com/eclipse-glsp/glsp-client/pull/403)
- [di] Use inversify ^6.1.3 as new baseline and update to sprotty 1.4.0 [#407](https://github.com/eclipse-glsp/glsp-client/pull/407)[#408](https://github.com/eclipse-glsp/glsp-client/pull/408)

#### Potentially Breaking Changes

- [di] Align Interface usage across \*Manager classes [#388](https://github.com/eclipse-glsp/glsp-client/pull/388)
    - Change DI bindings for: `GridManger` to `TYPES.IGridManager`, `ChangeBoundsManager` to `TYPES.IChangeBoundsManager` and `DebugManager` to `TYPES.IDebugManager`.
- [api] Improved performance of diagram loading routine [#398](https://github.com/eclipse-glsp/glsp-client/pull/398) - Contributed on behalf of Axon Ivy AG
    - Fix behavior of `postRequestModel` hook to actually work as descried in the documentation.
      Dispatching of long running actions in this hook can delay the initial model loading.
    - Directly calling model-aware functions in the `preInitialize` hook is discouraged.
      If needed dispatch an action instead.
      This ensures that the code will only be called once the model is available.

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.3.0)

#### Changes

- [api] Update align default type mappings with the client-side types [#97](https://github.com/eclipse-glsp/glsp-server-node/pull/97)
- [workflow] Fix a but in the `WorkflowEdgeCreationChecker` that prevented creation of weighted edges [#98](https://github.com/eclipse-glsp/glsp-server-node/pull/98)
- [model] Refactor `ModelSubmissionHandler` to use async live validation by default [#99](https://github.com/eclipse-glsp/glsp-server-node/pull/99/)

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.3.0)

#### Changes

- [node] Dropped support for node 16 & update minimum requirements for Node to >=18.x [#1457](https://github.com/eclipse-glsp/glsp/pull/1457)

## v2.2.1 - 22/07/2024

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.2.1)

#### Changes

- [diagram] Fix a bug that prevented proper rendering of templates/ghost elements during node creation in Firefox [#324](https://github.com/eclipse-glsp/glsp-client/pull/324) - Contributed on behalf of Axon Ivy AG
- [routing] Improve anchor point calculation for edge routing [#325](https://github.com/eclipse-glsp/glsp-client/pull/325)
- [validation] Fix a bug that could cause duplicate validation markers after a model update [#329](https://github.com/eclipse-glsp/glsp-client/pull/329)
- [di] Introduce a reusable `LazyInjector` that can be used for deferred retrial of services from the container. [#330](https://github.com/eclipse-glsp/glsp-client/pull/330)
    - Introduce `preLoadDiagram` hook for `IDiagramStartup`s. This hook is invoked right before the `DiagramLoader` starts the model loading process
- [launch] Introduce `GLSPWebWorkerProvider` to simply setting up a worker connection to a in-browser GLSP-server [#322](https://github.com/eclipse-glsp/glsp-client/pull/332)
- [diagram] Improve base abstract `UIExtension` to allow more fine-grained definition of container and parent [#333](https://github.com/eclipse-glsp/glsp-client/pull/333) - Contributed on behalf of Axon Ivy AG
- [protocol] Improve Geometry API. Add utility functions to `Bound`,`Dimension` and `Point`. Introduce `Vector` and `Movement` types [#341](https://github.com/eclipse-glsp/glsp-client/pull/341) - Contributed on behalf of Axon Ivy AG
- [features] Introduce optional `gridModule` for managing and rendering grids and `debugModule` that allows do display additional graphical debug information during development [#343](https://github.com/eclipse-glsp/glsp-client/pull/343) [#359](https://github.com/eclipse-glsp/glsp-client/pull/359)
- [diagram] Improve error handling of startup hooks [#346](https://github.com/eclipse-glsp/glsp-client/pull/346)
- [feature] Improve style handling in svg exporter [#354](https://github.com/eclipse-glsp/glsp-client/pull/354)
- [di] Improve `ContainerConfiguration` API and add additional checks to ensure that all ids of `FeatureModules` are unique [#355](https://github.com/eclipse-glsp/glsp-client/pull/355)
- [diagram] Update to sprotty 1.2.0. Non-breaking as all potential API breaks have been mitigated via the glsp-sprotty rexport layer [#357](https://github.com/eclipse-glsp/glsp-client/pull/357)
- [diagram] Fix a bug with the `AutocompleteWidget` that prevented proper application of valid suggestions [#362](https://github.com/eclipse-glsp/glsp-client/pull/362)
- [api] Improved behavior of default `ToolManager` to avoid unnecessary deactivation and reactivation of default tools [#367](https://github.com/eclipse-glsp/glsp-client/pull/367)
- [diagram] Add `onFocusChanged` event to `FocusTracker` and `EditorContextService` [#380](https://github.com/eclipse-glsp/glsp-client/pull/380)

#### Potentially Breaking Changes

- [API] Centralize most marquee selection behavior in the `MarqueeUtil` class which is now a singleton, injectable and needs the `DOMHelper`. This will cause a break if you manually created the class without injecting it. To construct it manually, you need to provide the `DomHelper` as a second argument [#373](https://github.com/eclipse-glsp/glsp-client/pull/373).
- [protocol] Avoid indirect dependency to `chai` introduce by accidentally exporting testing modules [#321](https://github.com/eclipse-glsp/glsp-client/pull/321)
    - `@eclipse-glsp/protocol` no longer exports `test-util.ts` via main index. If needed the module can still be imported via the full path `@eclipse-glsp/protocol/lib/utils/test-util.ts`
- [API] Apply feedback commands already on `SetModelCommand` and unify `rank` and `priority` property [#323](https://github.com/eclipse-glsp/glsp-client/pull/322).
    - Method `FeedbackAwareUpdateModelCommand.getFeedbackCommands` moved to `IFeedbackEmitter` for re-use, resulting in two new methods: `getFeedbackCommands` and `applyFeedbackCommands`.
    - Method `FeedbackAwareUpdateModelCommand.getPriority` is replaced by a generic `rank` property and the `Ranked` namespace.
    - The `priority` property (higher priority equals earlier execution) in `FeedbackCommand` is superseeded by a `rank` property (lower rank equals earlier execution).
- [DI] Introduce deferred injection for multi-injected services (listeners, action handlers etc.). Highly reduces the likelihood of circular dependency issues during container creation [#330](https://github.com/eclipse-glsp/glsp-client/pull/330).</br>
  No API breaks in the core API, but it introduces some minor breaks in protected methods/fields of default implementations:
    - `GLSPCommandStack`
        - Handling of `IGModelRootListeners` has moved to the `EditorContextService`.
        - `onModelRootChanged` is no deprecated. Use `EditorContextService.onModelRootChanged` instead
    - `EditorContextService`: The `postRequestModel` method has been removed. It was previously unused and effectively a no-op.
    - `SelectionService`: Injected `commandStack` property has been removed.
- [diagram] Introduce a reusable `FeedbackEmitter` base implementation that is stable across model updates and allows composing feedback before dispatching it [#342](https://github.com/eclipse-glsp/glsp-client/pull/342) </br>
  Refactored tool implementations and related services to make use of the new `FeedbackEmitter` API. This can cause potential breaks for adopters that have customized the default tool implementations.
  Affected tools and services: `MouseTrackingElementPositionListener`, `HelperLineManager`, `FeedbackMoveMouseListener`, `NodeCreationToolMouseListener`, `EdgeEditListener`,
- [diagram] Refactor and improve `ChangeBounds` API by introducing a centralized `ChangeBoundsManage` and `ChangeBoundsTracker` [#344](https://github.com/eclipse-glsp/glsp-client/pull/344) [#348](https://github.com/eclipse-glsp/glsp-client/pull/348) [#352](https://github.com/eclipse-glsp/glsp-client/pull/352) - Contributed on behalf of Axon Ivy AG
  This can cause potential breaks for adopters that have customized the default tool implementations </br>
  Affected tools and services: `MouseTrackingElementPositionListener`, `FeedbackMoveMouseListener`, `ChangeBoundsTool`, `ChangeBoundsListener`,`FeedbackEdgeRouteMovingMouseListener`, `NodeCreationTool`,

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.2.1)

#### Changes

- [layout] Ensure that model is updated correctly when using `automatic` server layout [#74](https://github.com/eclipse-glsp/glsp-server-node/pull/74)
- [gmodel] Add proper undefined/null handling in GModel builder functions [#76](https://github.com/eclipse-glsp/glsp-server-node/pull/76)
- [launch] Improve Winston-Logger implementation to properly handle non-serializable objects [#82](https://github.com/eclipse-glsp/glsp-server-node/pull/82)
- [layout] Ensure that including `ElkLayoutEngine` engine does not error in browser-only server implementations [#83](https://github.com/eclipse-glsp/glsp-server-node/pull/83)
- [gmodel] Introduce new `Resizable` interface that is implemented by all `GShapeElements` and allows per-element definition of resize handle locations [#84](https://github.com/eclipse-glsp/glsp-server-node/pull/84)
- [action] Ensure that actions queued with `dispatchAfterNextUpdate` are also dispatched after the initial `SetModelAction` [#88](https://github.com/eclipse-glsp/glsp-server-node/pull/88)

#### Potentially Breaking Changes

- [protocol] Removed local definition of `GIssueMarker` and reuse it from `@eclipse-glsp/protocol` instead [#88](https://github.com/eclipse-glsp/glsp-server-node/pull/88)
    - => `GIssueMarker` is now an interface instead of a class

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.2.1)

#### Changes

- [cli] Contribute the `generateIndex` command to the GLSP CLI. Allows autogeneration of index files in GLSP projects. [#1197](https://github.com/eclipse-glsp/glsp/pull/1197)
- [cli] Fix version updating of example servers in `release` CLI command. [#1226](https://github.com/eclipse-glsp/glsp/pull/1226)
- [cli] Refactor and simplify `checkHeader` CLI command. Focus on end year copyright header validation and remove the error-prone validation of the start year. [#1289](https://github.com/eclipse-glsp/glsp/pull/1289)
- [cli] Contribute the `updateNext` command to the GLSP CLI tool. Allows updating of all dependencies in GLSP projects that are tagged with `next´. [1229](https://github.com/eclipse-glsp/glsp/pull/1299)
- [ts-config] Update ts target to `ES2019` [#1372](https://github.com/eclipse-glsp/glsp/pull/1372)

## v2.1.0 - 23/01/2024

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.1.0)

#### Changes

- [diagram] Fix a bug that prevented correct rendering of projection bars when using `GLSPProjectionView` [#298](https://github.com/eclipse-glsp/glsp-client/pull/298)
- [a11y] Improved responsibility and feedback when resizing or moving diagram elements with keyboard-only commands [#295](https://github.com/eclipse-glsp/glsp-client/pull/295)
- [diagram] Extends `configureDiagramOptions` function to also allow partial configuration of `ViewerOptions` [#296](https://github.com/eclipse-glsp/glsp-client/pull/296)
- [diagram] Remove unused handleSetContextActions from ToolPalette [#301](https://github.com/eclipse-glsp/glsp-client/pull/301)
- [diagram] Deprecate `ISModelRootListener` API in favor of `IGModelRootListener` [#303](https://github.com/eclipse-glsp/glsp-client/pull/303)
- [diagram] Ensure that the suggestion container position of the `AutoCompleteWidget` is rendered correctly [#304](https://github.com/eclipse-glsp/glsp-client/pull/304)
- [feature] Extend `ToolPalette`/`CreateOperation` API to support rendering of preview/ghost elements when creating new nodes [#301](https://github.com/eclipse-glsp/glsp-client/pull/301)
- [protocol] Fix a bug in `BaseJsonRpcClient` to ensure that it can handle multiple open diagram sessions [#307](https://github.com/eclipse-glsp/glsp-client/pull/307)
- [diagram] Restructure some tools to have a more common infrastructure and support helper lines [#306](https://github.com/eclipse-glsp/glsp-client/pull/306)
- [diagram] Fix a bug in `SelectionService` that caused issues with inversify when injecting certain services (e.g. `ActionDispatcher`) in `SelectionChangeListener` implementations [#305](https://github.com/eclipse-glsp/glsp-client/pull/305)
- [diagram] Ensure that the `SelectionService` does not trigger a change event if the selection did not change on model update [#313](https://github.com/eclipse-glsp/glsp-client/pull/313)

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.1.0)

_Released on 25/01/2024._

#### Changes

- [operation] Add support for defining ghost elements/templates in `CreateNodeOperationHandler`'s [#65](https://github.com/eclipse-glsp/glsp-server-node/pull/65)
- [launch] Use "127.0.0.1" as default host to avoid potential IP v4/v6 connection issues [#67](https://github.com/eclipse-glsp/glsp-server-node/pull/67)
- [gmodel] Fix a bug in `GModelDeleteOperationHandler` that prevented deletion of multiple selected elements [#68](https://github.com/eclipse-glsp/glsp-server-node/pull/68)

## v2.0.0 - 14/10/2023

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v2.0.0)

#### Changes

- [layout] Improve Layouter to support more dynamic layouts and complex parent/children node structures [#187](https://github.com/eclipse-glsp/glsp-client/pull/187) - Contributed on behalf of STMicroelectronics
- [diagram] Fix SVG export for nested root elements e.g. `GLSPProjectionView` [#196](https://github.com/eclipse-glsp/glsp-client/pull/196)
- [diagram] Scope the styles to not break existing application layout [#209](https://github.com/eclipse-glsp/glsp-client/pull/209)
- [routing] Ensure that routes are properly re-calculated when moving a routing point [#198](https://github.com/eclipse-glsp/glsp-client/pull/198)
- [diagram] Fix a bug in the `EditLabelUIExtension` where the diagram becomes dirty without an actual change. [#766](https://github.com/eclipse-glsp/glsp/issues/766)
- [diagram] Extend `ComputedBoundsAction` definition with routing information. This enables proper forwarding of client-side computed routes to the server [#201](https://github.com/eclipse-glsp/glsp-client/pull/201/)
- [DI] The `createClientContainer` function is now deprecated. Please use `initializeDiagramContainer` instead. This new function can also be used with `ModuleConfigurations` which allow a more fine granular configuration by adding new modules and/or removing default modules. [#218](https://github.com/eclipse-glsp/glsp-client/pull/218) [#231](https://github.com/eclipse-glsp/glsp-client/pull/231) [#236](https://github.com/eclipse-glsp/glsp-client/pull/236)
- [diagram] Fix incorrect calculation of decorator popup positions for edges. [#221](https://github.com/eclipse-glsp/glsp-client/pull/221)
- [protocol] Introduce a reusable `Disposable` type [#222](https://github.com/eclipse-glsp/glsp-client/pull/222)
- [protocol] Introduce reusable utility functions for DI configuration [#236](https://github.com/eclipse-glsp/glsp-client/pull/236)[#237](https://github.com/eclipse-glsp/glsp-client/pull/237)
- [diagram] Augment diagram SVG with additional model metadata to enable easier integration tests and accessibility [#239](https://github.com/eclipse-glsp/glsp-client/pull/239)
- [validation] Add and track reason for validation markers (e.g. batch and live validation) [#243](https://github.com/eclipse-glsp/glsp-client/pull/243)
- [protocol] Introduce optional `deselectAll` flag for `SelectAction`s [#257](https://github.com/eclipse-glsp/glsp-client/pull/257)
- [protocol] Provide the common interfaces and type definitions for TS-based GLSP servers [#245](https://github.com/eclipse-glsp/glsp-client/pull/245) - Contributed on behalf of STMicroelectronics
- [diagram] Introduce a new set of accessability features for disability-aware conceptual modeling and keyboard-only diagram interactions. (experimental) [#240](https://github.com/eclipse-glsp/glsp-client/pull/240) [#241](https://github.com/eclipse-glsp/glsp-client/pull/241) [#242](https://github.com/eclipse-glsp/glsp-client/pull/242) [#254](https://github.com/eclipse-glsp/glsp-client/pull/254) [#276](https://github.com/eclipse-glsp/glsp-client/pull/276) [#279](https://github.com/eclipse-glsp/glsp-client/pull/279)
- [API] Re-work tool and feedback structure [#264](https://github.com/eclipse-glsp/glsp-client/pull/264) [#274](https://github.com/eclipse-glsp/glsp-client/pull/274)
    - Introduce `registerListener` method on GLSP mouse and key tool to return a disposable for de-registration
    - Adapt `registerFeedback` method from feedback dispatcher to return a disposable for de-registration
    - Introduce dedicated `BaseGLSPCreationTool` for tools based on trigger actions
    - Introduce `toDisposeOnDisable` collection in `BaseGLSPTool` to register disable handling during enablement
- [DI] Introduce and consistently use `FeatureModule`s instead of plain inversify `ContainerModule`s [#267](https://github.com/eclipse-glsp/glsp-client/pull/267)
- [diagram] Introduce `statusModule` that binds UI extension to handle & render `GLSPStatusMessages`. [#272](https://github.com/eclipse-glsp/glsp-client/pull/272)
- [diagram] Provide generic dirty state handling in `EditorContextService` [#272](https://github.com/eclipse-glsp/glsp-client/pull/272)
- [diagram] Fix bug that broke edge edit (routing) in certain cases [#273](https://github.com/eclipse-glsp/glsp-client/pull/273)
- [API] Introduce `DiagramLoader` component + life cycle management [#274](https://github.com/eclipse-glsp/glsp-client/pull/274) [#282](https://github.com/eclipse-glsp/glsp-client/pull/282)
    - Integration projects no longer need to manually implement the initial diagram loading. Instead a set of configurations`IDiagramOptions` and then the diagram loader
      is invoked and initializes the diagram.
    - Add a `onServerInitialized` event to the `GLSPClientAPI`.
    - Introduce `IDiagramStartup` service. Adopters can multi bind this service to hook into the diagram loading lifecycle and provide additional logic. i.e. dispatching of initial actions.
- [diagram] Fix a bug that broke edge intersection detection when using the `GLSPProjectionView` [#275](https://github.com/eclipse-glsp/glsp-client/pull/275/)
- [diagram] Fix a bug regarding focus handling when integrated in an application frame like Theia [#278](https://github.com/eclipse-glsp/glsp-client/pull/278)

#### Breaking Changes

- [DI] Injecting an `IButtonHandler` constructor is now deprecated. Please use `configureButtonHandler()` instead. [#195](https://github.com/eclipse-glsp/glsp-client/pull/195) - Contributed on behalf of STMicroelectronics
- [node] Update minimum requirements for Node to >=16.11.0 [#210](https://github.com/eclipse-glsp/glsp-client/pull/210)
- [protocol] Renamed `UndoOperation` and `RedoOperation` to `UndoAction` and `RedoAction` to match operation specification [#216](https://github.com/eclipse-glsp/glsp-client/pull/216)
- [protocol] Remove dependency to `vscode-ws-jsonrpc`. The protocol package now directly offers functions to create a websocket rpc connections [#215](https://github.com/eclipse-glsp/glsp-client/pull/215)
- [protocol] The `elementIds` property of `LayoutOperation` is now optional. If `undefined` the entire model will be layouted [#232](https://github.com/eclipse-glsp/glsp-client/pull/232)
- [API] Refactored base API [#259](https://github.com/eclipse-glsp/glsp-client/pull/#259)
    - Removed the `TYPES.SelectionService` service identifier. Please directly use the `SelectionService` class as service identifier instead
    - The `SelectionService` binding is now part of the `defaultGLSPModule`. This means the `SelectionService` remains available even if the `selectModule` is not configured
    - `RootModelChangeListener`s are no longer tied to the `FeedbackawareUpdateModelCommand` instead they are managed by the `GLSPCommandStack`
    - `IMouseTool` and `TYPES.IMouseTool` are no longer available. Directly inject and use `MouseTool` instead
    - Refactored rank utility functions
        - `isRanked()` -> `Ranked.is()`
        - `getRank()` -> `Ranked.getRank()`
        - `DEFAULT_RANK` -> `Ranked.DEFAULT_RANK`
- [API] Introduce Event API to replace the old listener/notifier pattern [#261](https://github.com/eclipse-glsp/glsp-client/pull/#261)
    - Reworked `SelectionService`, `GlspCommandStack` & `EditorContextService` to make use of this new API
    - Removed explicit (de)registration methods for listeners. Use the corresponding event property (e.g. `SelectionService.onSelectionChanged`) instead
    - Aligned naming of injectable interfaces & service identifiers to consistently use the `I` prefix
- [API] Re-work tool and feedback structure [#264](https://github.com/eclipse-glsp/glsp-client/pull/264)
    - Remove generic `toolsModule` and `toolFeedbackModule` in favor of individual tool modules
    - Rename `dispatchFeedback` in `BaseGLSPTool` to `registerFeedback` to align with feedback dispatcher
    - Switch arguments in `deregisterFeedback` in `BaseGLSPTool` for easier de-registration and clean up actions
- [protocol] Add messages for server-side progress reporting and remove timeout in `ServerMessageAction` [#265](https://github.com/eclipse-glsp/glsp-client/pull/265)
- [DI] Renamed and aligned prefixes of DI modules. [#266](https://github.com/eclipse-glsp/glsp-client/pull/266)
    - Removed `glsp` prefix from all modules (e.g. `glspSelectModule`-> `selectModule`)
    - In addition, the following modules have been renamed
        - `defaultGLSPModule`-> `baseModule`
        - `modelHintsModule` -> `typeHintsModule`
        - `enableDefaultToolsOnFocusLossModule` -> `toolFocusLossModule`
        - `glspEditLabelModule` -> `labelEditModule`
- [websocket] Introduce a reusable `GLSPWebSocketProvider` class that supports reconnect on connection loss [#269](https://github.com/eclipse-glsp/glsp-client/pull/269)
- [API] Introduce `GLSPModelSource` as default implementation for sprotty's `ModelSource`API [#272](https://github.com/eclipse-glsp/glsp-client/pull/272) [#287](https://github.com/eclipse-glsp/glsp-client/pull/287)
    - `GLSPDiagramServer` has been deprecated and is no longer available
    - `SelectionServiceAwareContextMenuMouseListener` renamed to `GLSPContextMenuMouseListener`
    - `SourceURIAware` interface has been removed. No longe required since we only have one `GLSPModelSource` binding now.
- [protocol] Revise TypeHints API and introduce possibility to dynamically query the server for complex connection conditions [#285](https://github.com/eclipse-glsp/glsp-client/pull/285)
    - `EdgeTypeHint`
        - `sourceElementTypeIds` and `targetElementTypeIds` are now optional. If not provided all connection targets are allowed
        - Introduce `dynamic` flag. If a hint has this flag enabled connection tools know that the have to query there server in addition
          to checking the default `Connectable.canConnect` method.
    - Introduce `RequestCheckEdgeAction` & `CheckEdgeResultAction` used to query the server wether the provide edge information is valid.
      Used in combination with dynamic type hints.
- [protocol] Refactor base protocol & actions [#287](https://github.com/eclipse-glsp/glsp-client/pull/287)
    - Rename `ServerStatusAction` -> `StatusAction`
    - Rename `ServerMessageAction` -> `MessageAction`
    - Extend `InitializeClientSessionParams` with a `clientActions` property. This is used by the server to now which action kinds are (also) handled by the client.
- [API] Update to sprotty 1.0.0 and consistently use `GModel` naming scheme on client side [#291(https://github.com/eclipse-glsp/glsp-client/pull/291)]
- Move augmented GLSP reexport of sprotty into dedicated package `@eclipse-glsp/sprotty`
- With sprotty 1.0.0 the `SModel` classes haven been renamed by adding an Impl suffix (`SModelElement`->`SModelElementImpl`). We took this opportunity and aliased all sprotty model elements to consistently use `GModel`
    - `SModelElement` -> `GModelElement`
    - `SNode`-> `GNode`
    - `SShapeElement`->`GShapeElement` etc.

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v2.0.0)

#### Changes

- [elk] Fix a bug in the `GLSElkLayoutEngine` that skipped layouting of certain edges [#23](https://github.com/eclipse-glsp/glsp-server-node/pull/23) - Contributed on behalf of STMicroelectronics
- [launch] The message sent after successful startup now also contains the effective socket port [#30](https://github.com/eclipse-glsp/glsp-server-node/pull/30) - Contributed on behalf of STMicroelectronics
- [launch] Fix a bug that caused the server to not properly dispose all resources when `shutdown` was called [#33](https://github.com/eclipse-glsp/glsp-server-node/pull/33) - Contributed on behalf of STMicroelectronics
- [diagram] Fix a bug to ensure that the copy&paste feature is working properly [#35](https://github.com/eclipse-glsp/glsp-server-node/pull/35)
- [api] Ensure that all `Promise`s and `MaybePromise`s have proper rejection handling [#36](https://github.com/eclipse-glsp/glsp-server-node/pull/36)- Contributed on behalf of STMicroelectronics
- [launch] Add a launcher component for starting WebSocket based GLSP servers [#41](https://github.com/eclipse-glsp/glsp-server-node/pull/41)
- [validation] Add explicit support and API for live and batch validation [#43](https://github.com/eclipse-glsp/glsp-server-node/pull/43)
- [launch] Launcher components now auto allocate a free port if the port argument is 0 [#42](https://github.com/eclipse-glsp/glsp-server-node/pull/42)
- [server] Add support for server progress reporting [#52](https://github.com/eclipse-glsp/glsp-server-node/pull/52)
- [diagram] Add support for handling reconnection requests to `RequestModelActionHandler` [#54](https://github.com/eclipse-glsp/glsp-server-node/pull/54/)
- [server] Update `AbstractJsonModelStorage` to ensure that Windows file paths are properly converted [#55](https://github.com/eclipse-glsp/glsp-server-node/pull/55)
- [deps] Remove unneeded dependency to `fs-extra` [#56](https://github.com/eclipse-glsp/glsp-server-node/pull/56)
- [diagram] Provide generic reusable base operation handlers for JSON-based source models [#59](https://github.com/eclipse-glsp/glsp-server-node/pull/59)
- [diagram] Add support for dynamic edge type hints
    - Provide `EdgeCreationChecker` API. Adopters can implement this to handle dynamic edge creation validation requests. [#60](https://github.com/eclipse-glsp/glsp-server-node/pull/60)
- [model] Introduce new `GForeignObjectElement` + builder class [#61](https://github.com/eclipse-glsp/glsp-server-node/pull/61)

#### Breaking Changes

- [graph] Align GGraph model with newest changes from glsp-server [#22](https://github.com/eclipse-glsp/glsp-server-node/pull/22) - Contributed on behalf of STMicroelectronics
    - Renamed interfaces:
        - `EdgePlacement` -> `GEdgePlacement` (affected classes: `GEdgeLayoutable`, `GLabel`)
        - `GLayoutContainer` -> `GLayouting` (affected classes: `GCompartment`, `GGraph`, `GNode`)
        - `GShapePreRenderedElement` -> `GShapedPreRenderedElement`
- [deps] Update minimum requirements for Node to >=16.11.0 [#32](https://github.com/eclipse-glsp/glsp-client/pull/32)
- [api] Restructure `@eclipse-glsp/server-node` package to provide entry points for both node and browser-only environments [#37](https://github.com/eclipse-glsp/glsp-server-node/pull/37)
    - The package has been renamed to `@eclipse-glsp/server`. This change affects all import namespaces.
    - New namespaces for environment specific code:
        - `@eclipse-glsp/server/node`
        - `@eclipse-glsp/server/browser`
- [operation] Implement Command API and rework OperationHandler to provide an optional command instead of direct execution to allow more execution control (including undo & redo support) [#38](https://github.com/eclipse-glsp/glsp-server-node/pull/38) [#59](https://github.com/eclipse-glsp/glsp-server-node/pull/59)
    - This includes major breaking changes across the whole API:
        - `OperationHandler` has been refactored from an interface to a common abstract base class. The `execute` method now has to return a `MaybePromise<Command|undefined>`
        - Refactor `CreateOperationHandler` to an interface instead of a class
        - Rename the services and handlers of the direct GModel library => consistent use of `GModel` prefix
        - The `ModelState` interface no longer has an `isDirty` flag. Dirty state is now handled by the `CommandStack`
- [server] Default port has changed from 5007 (and 8081 for websocket) to 0, which implies autoassignment by the OS [#42](https://github.com/eclipse-glsp/glsp-server-node/pull/42)
- [server] Refactored `GLSPServer` and `GLSPServerLauncher` API [#44](https://github.com/eclipse-glsp/glsp-server-node/pull/44) - Contributed on behalf of STMicroelectronics
    - Server type definitions are now consumed from `@eclipse-glsp/protocol`
    - `GLSPServer` implementation is no longer relies on json-rpc implementation details.
    - JSON-RPC setup is now done with `JsonRpcGLSPServerLauncher`
- [api] Provide `CommandStack` API to support undo/redo of model changes [#38](https://github.com/eclipse-glsp/glsp-server-node/pull/38) [#39](https://github.com/eclipse-glsp/glsp-server-node/pull/39) - Contributed on behalf of STMicroelectronics
    - `ModelState` no longer has a `isDirty` property
    - Breaking refactor of `OperationHandler` API
- [deps] Update to inversify 6.x and Typescript 5.x. [#48](https://github.com/eclipse-glsp/glsp-server-node/pull/48)
    - GLSP uses a synchronous inversify context this means with inversify 6.x decorator methods (e.g. `@postConstruct`) with asynchronous results are no longer supported
- [api] Revise model loading and client action handling [#57](https://github.com/eclipse-glsp/glsp-server-node/pull/57) [#58](https://github.com/eclipse-glsp/glsp-server-node/pull/58)
    - Refactor `ModelSubmissionHandler` to enable handling of `RequestModelAction` as proper request action
        - Introduce a `submitInitialModel` method that is called by the `RequestModelActionHandler`
    - Remove `configureClientActions` from `DiagramModule` as client actions are now implicitly configured via `InitializeClientSession` request
    - Remove `ClientActionHandler` and replace with `ClientActionForwarder`
    - Rename `ServerStatusAction` -> `StatusAction` and `ServerMessageAction` -> `MessageAction`

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v2.0.0)

_Released on 13/10/2023._

#### Changes

- [config] Update all dependencies & peerDependencies of the dev to the latest version [#1136](https://github.com/eclipse-glsp/glsp/pull/1136)
- [protocol] Removed `Protocol.MD` file. [#892](https://github.com/eclipse-glsp/glsp/pull/982)
    - The protocol documentation is now maintained on <https://eclipse.dev/glsp/documentation/protocol/>
- [eslint-config] Tweaked `chai-friendly/no-unused expression` rule to enable `allowTenary` and `allowShortCircuit` options. [#936](https://github.com/eclipse-glsp/glsp/pull/936)
- [config] Introduce all-in-one [`@eclipse-glsp/dev`](https://www.npmjs.com/package/@eclipse-glsp/dev) meta package. [#842](https://github.com/eclipse-glsp/glsp/pull/842)
- [cli] Contribute the `checkHeaders` command to validate the copyright year (range) of license headers. [#834](https://github.com/eclipse-glsp/glsp/pull/834)
- [config] Introduce [`@eclipse-glsp/nyc-config`](https://www.npmjs.com/package/@eclipse-glsp/nyc-config)
  package and the [`@eclipse-glsp/config-test`](https://www.npmjs.com/package/@eclipse-glsp/config-test) meta package. [#755](https://github.com/eclipse-glsp/glsp/pull/755)

    - Contribute the `coverageReport` command to create a full nyc test coverage report for a lerna/yarn mono repository

- [cli] Introduce [`@eclipse-glsp/cli`](https://www.npmjs.com/package/@eclipse-glsp/cli)
  package to offer CLI tooling & utility scripts for GLSP projects. [#755](https://github.com/eclipse-glsp/glsp/pull/755) - Contributed on behalf of STMicroelectronics
    - Contribute the `release` command to prepare & publish a new Github release for a specific GLSP component
- [deps] Updates dependencies of `@eclipse-glsp/config` and `@eclipse-glsp/config-test` packages to the latest version [#1023](https://github.com/eclipse-glsp/glsp/pull/1023)

#### Breaking Changes

- [node] Update minimum requirements for Node to >=16.11.0 [#829](https://github.com/eclipse-glsp/glsp/pull/829)
- [config] Typescript is now a peerDependency, a concrete matching Typscript depdendency has to be provided by consuming projects[#1023](https://github.com/eclipse-glsp/glsp/pull/1023)

## v1.0.0 - 30/06/2022

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v1.0.0)

#### Changes

- [diagram] Fix a bug where the edge creation tool would select the wrong child when used inside of a nested node [#158](https://github.com/eclipse-glsp/glsp-client/pull/158/)
- [example] Improved and modernized styling of the GLSP workflow example [#160](https://github.com/eclipse-glsp/glsp-client/pull/160)
- [contextMenu] Ensured that closing the context menu correctly restores the diagram focus. [#469](https://github.com/eclipse-glsp/glsp-client/pull/161)
- [build] Updated Typescript to version 4.5.5 and enforced `noImplicitOverride` [#167](https://github.com/eclipse-glsp/glsp-client/pull/167)
- [diagram] Added support for snapping edges (routing points) similar to how its done for moving/resizing elements. [#170](https://github.com/eclipse-glsp/glsp-client/pull/170)
- [layout] Implemented a custom layouter for HBox that supports nested compartments. [#174](https://github.com/eclipse-glsp/glsp-client/pull/174)
- [diagram] Disable tool execution on focus loss and reactive the default tools. [#175](https://github.com/eclipse-glsp/glsp-client/pull/175)
- [routing] Routing handles are now properly snapped if an `ISnapper` implementation is bound. [#177](https://github.com/eclipse-glsp/glsp-client/pull/177)
- [routing] Fix a bug that caused short animation flickering whenever a routing point was moved. [#182](https://github.com/eclipse-glsp/glsp-client/pull/182)
- [context] Properly integrated the browser context menu listeners -> Context menus now also work on Mac OS [#183](https://github.com/eclipse-glsp/glsp-client/pull/183)

#### Breaking Changes

- [protocol] Updated to sprotty >=0.11.0. With the new sprotty version the action declaration approach has been reworked from ES6 classes to plain interfaces + namespaces. To keep action declaration and creation consistent all action definitions of the protocol and client package have been updated as well. The old class based definitions are no longer available. This mainly affects construction calls
  which have to be changed from `new SomeAction()` to using the create function of the corresponding namespace `SomeAction.create()`. In addition, typeguard functions have been included in the action namespaces as well and can now be used with `SomeAction.is()` instead of using a dedicated `isSomeAction()` function.
  <br>[#472](https://github.com/eclipse-glsp/glsp-client/pull/171) - Contributed on behalf of STMicroelectronics
- [DI] Unified the sprotty `TYPE` and `GLSP_TYPE` service identifier constants. They are reexported from the client main index as `TYPE`. The old `GLSP_TYPE` constant definition has been
  deprecated will potentially be removed in the future. [#472](https://github.com/eclipse-glsp/glsp-client/pull/171)
- [protocol] Rename `ModelSourceChangedAction` to `SourceModelChangedAction` including handlers etc [#655](https://github.com/eclipse-glsp/glsp-client/pull/184)
- [diagram] Cleanup/refactor various commands and action handlers. [#176](https://github.com/eclipse-glsp/glsp-client/pull/176)
    - Rename `layoutCommandsModule` to `layoutModule`
    - Change handling of `ResizeElement` and `AlignElement` actions to pure action handlers instead of commands.
    - Change handling of `NavigateToMarkersAction` to a pure action handler instead of commands
    - Refactor handler for `SetMarkersAction` to a standalone action handler instead of an command

### [Server](https://github.com/eclipse-glsp/glsp-server-node/releases/tag/v1.0.0)

Inception of the Node GLSP Server.
This project provides the Node based server component for the Eclipse Graphical Language Platform (GLSP).
The implementation of this server is aligned with the default Java based [GLSP Server](https://github.com/eclipse-glsp/glsp-server).
The [initial implementation](https://github.com/eclipse-glsp/glsp-server-node/commit/4fba8e8beef07798a7eff27c9c04ca68583e5960) was contributed on behalf of STMicroelectronics.
The following list composes changes that have been made since the initial implementation.

#### Changes (since the initial contribution)

- [core] Implement `dispatchOnNextUpdate` method that enables queuing of actions that should be dispatched after the next graphical model update. [#1](https://github.com/eclipse-glsp/glsp-server-node/pull/1) - Contributed on behalf of STMicroelectronics
- [diagram] Implement LayoutEngine API for server-side autolayouting & provide an integration package for layout engines based on ELK. [#2](https://github.com/eclipse-glsp/glsp-server-node/pull/2) [#5](https://github.com/eclipse-glsp/glsp-server-node/pull/5) - Contributed on behalf of STMicroelectronics

#### Breaking Changes

- [model] Source model refactorings [#11](https://github.com/eclipse-glsp/glsp-server-node/pull/11)
    - `ModelSourceLoader` → `SourceModelStorage`
    - Added method to `SourceModelStorage`
- [model] Refactor `ModelState` API [#20](https://github.com/eclipse-glsp/glsp-server-node/pull/20)
    - Introduce `updateRoot` method
    - `DefaultModelState` => make root setter protected
- [gmodel] Refactor & Move all base & helper classes for the direct GModel usecase into own `gmodel-lib` subdirectory [#16](https://github.com/eclipse-glsp/glsp-server-node/pull/16)

### [Dev Packages](https://github.com/eclipse-glsp/glsp/releases/tag/v1.0.0)

Inception of the GLSP dev packages.
This project is part of the GLSP umbrella repository and provides common shared development packages for Eclipse GLSP components that are implemented with Typescript.

- [`@eclipse-glsp/config`](https://www.npmjs.com/package/@eclipse-glsp/config): Meta package for shared build configuration
- [`@eclipse-glsp/ts-config`](https://www.npmjs.com/package/@eclipse-glsp/ts-config): Shared Typescript configuration for GLSP projects
- [`@eclipse-glsp/eslint-config`](https://www.npmjs.com/package/@eclipse-glsp/esling-config): Shared ESLint configuration for GLSP projects
- [`@eclipse-glsp/prettier-config`](https://www.npmjs.com/package/@eclipse-glsp/prettier-config): Shared Prettier configuration for GLSP projects

## v0.9.0 - 09/12/2021

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/v0.9.0)

#### Changes

- [feature] Improve external navigation support through dedicated action. [#95](https://github.com/eclipse-glsp/glsp-client/pull/95)
- [build] Added a download script to download the latest workflow-glsp-server JAR from maven artifactory [#99](https://github.com/eclipse-glsp/glsp-client/pull/99)
- [diagram] Fix a bug that kept the hover feedback visible after the diagram widget becomes inactive [#102](https://github.com/eclipse-glsp/glsp-client/pull/102)
- [diagram] Extended the `ModifyCssFeedbackAction` to support both `string[]` and `SModelElement[]` as input [#103](https://github.com/eclipse-glsp/glsp-client/pull/103)
- [diagram] Improved extensibility of `AutoCompleteWidget` by enabling changing of settings without having to re-instantiate the entire widget [#104](https://github.com/eclipse-glsp/glsp-client/pull/104)
- [model] Added `SArgumentable` interface for denoting `SModelElement`s that contain an arbitrary arguments map [#106](https://github.com/eclipse-glsp/glsp-client/pull/106)
- [diagram] Implemented a marquee selection tool to select multiple elements at once by drawing a rectangle. [#108](https://github.com/eclipse-glsp/glsp-client/pull/108) [#120](https://github.com/eclipse-glsp/glsp-client/pull/120)
- [protocol] Added `fileUri` property to `SaveModelAction`. This can be used to implement save-as functionality [#109](https://github.com/eclipse-glsp/glsp-client/pull/109)
- [protocol] Implemented missing typeguard functions for all protocol operations [#110](https://github.com/eclipse-glsp/glsp-client/pull/110)
- [diagram] Implemented a reusable utility function (`configureDefaultModelElements`) that handles configuration of default model elements and views.
  Introduce reusable view for rounded corner nodes and and improved edge view that supports custom padding for easer mouse handling. Adapted the workflow example to make use of these new views [#113](https://github.com/eclipse-glsp/glsp-client/pull/113)
- [example] Cleaned up and reworked the workflow example. Additional css classes are now applied directly to the `SModelElement` instead of using custom views. Removed now obsolete classes `TaskNodeView` and `WeightedEdgeView` [#116](https://github.com/eclipse-glsp/glsp-client/pull/116)
- [diagram] Fix a bug in the connection tool regarding the feedback edge snapping computation for nested elements. [#123](https://github.com/eclipse-glsp/glsp-client/pull/123)
- [diagram] Fix a bug in the copy& paste behavior. [#124](https://github.com/eclipse-glsp/glsp-client/pull/124)
- [protocol] Fix the definition of `ChangeContainerOperation`. [#115](eclipse-glsp/glsp-server#115)
- [protocol] Remove the `name` property from `GLSPClient`. [#130](https://github.com/eclipse-glsp/glsp-client/pull/130)
- [diagram] Fix a bug in Firefox that required elements to be selected before they can be moved. [#134](https://github.com/eclipse-glsp/glsp-client/pull/134)
- [build] Upgrade to Snabbdom3 and ES2017 [#137](https://github.com/eclipse-glsp/glsp-client/pull/137)
- [protocol] Extract action message protocol and action definitions from `@eclipse-glsp/client` and move to `@eclipse-glsp/protocol` [#141](https://github.com/eclipse-glsp/glsp-client/pull/141) - Contributed on behalf of STMicroelectronics
- [diagram] Fix a bug that occurred when moving nested elements. [#135](https://github.com/eclipse-glsp/glsp-client/pull/135)
- [example] Added support for structured nodes (categories) in workflow-example. [#136](https://github.com/eclipse-glsp/glsp-client/pull/136)
- [diagram] Fix a bug related to the mouse cursor position on resize. [#144](https://github.com/eclipse-glsp/glsp-client/pull/144)
- [model] Add a convenience method to create a container with default modules. [#145](https://github.com/eclipse-glsp/glsp-client/pull/145)

#### Breaking Changes

- [diagram] Introduce `glspViewportModule`. This module contains a custom `ScrollMouseListener` that gets disabled if the `MarqueeTool` is active. This module should be used instead of the `viewportModule` provided by sprotty [#108](https://github.com/eclipse-glsp/glsp-client/pull/108)
- [protocol] Fix the definition of `ChangeContainerOperation`. The type of the `location` property has been changed from `string` to `Point`. [#115](eclipse-glsp/glsp-server#115)
- [protocol] Remove the `name` property from `GLSPClient`. [#130](https://github.com/eclipse-glsp/glsp-client/pull/130)
- [build] Upgrade to Snabbdom3 and ES2017. Depended packages should upgrade to ES2017 as well. [#137](https://github.com/eclipse-glsp/glsp-client/pull/137)

## v0.8.0 - 20/10/2020

### [Client](https://github.com/eclipse-glsp/glsp-client/releases/tag/0.8.0)

This is the first release of Eclipse GLSP since it is hosted at the Eclipse Foundation.
The 0.8.0 release includes new protocol message types and respective framework support for several new features, such as copy-paste, diagram navigation, etc. It also contains several clean-ups of the protocol and refactorings to simplify and streamline the API.
The Eclipse Theia integration of GLSP features many improvements, such as problem marker integration, native context menu items and keybindings. Finally, several bug fixes and minor are part of this release as well.
