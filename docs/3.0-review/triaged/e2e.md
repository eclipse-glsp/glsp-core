# E2E: `e2e/*`

Packages: `e2e/playwright` (the published `@eclipse-glsp/glsp-playwright` framework, 111 modules) and
`e2e/workflow-e2e` (the Workflow suite that consumes it).

**3 findings**, each filed as its own sub-issue of [#1761](https://github.com/eclipse-glsp/glsp/issues/1761):
[#1762](https://github.com/eclipse-glsp/glsp/issues/1762), [#1763](https://github.com/eclipse-glsp/glsp/issues/1763)
and [#1764](https://github.com/eclipse-glsp/glsp/issues/1764). All three come from the layering sweep, because the
e2e packages were in scope only as *consumers* of the client and of the workspace graph. Test architecture itself was
deliberately excluded from this review (see [What was not reviewed](#what-was-not-reviewed)).

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

---

## Findings

### E2E-1 · `e2e/playwright` is a single 98-module import cycle, created by sibling barrels the lint rule doesn't cover

> Filed as [#1762](https://github.com/eclipse-glsp/glsp/issues/1762).

- **Location:** `oxlint.config.mts:233` (`ownAndParentBarrels(10)` bans only `'.'`, `'..'`, `'../..'`, …) · concrete value cycle: `e2e/playwright/src/glsp/graph/elements/index.ts:16` → `glsp/graph/elements/edge.ts:18` → `glsp/graph/decorators/index.ts:17` → `glsp/graph/decorators/edge.decorator.ts:16` → back to `elements/index.ts`
- **What's wrong:** 98 of 111 modules form one strongly connected component because modules import _sibling_ directory barrels (`../remote` 28 times, `../types` 25, `../extension` 15, `../graph` 15), closing exactly the runtime cycle the rule's own comment says it exists to prevent. `packages/client/client` has no per-directory barrels and no such cycle, so the published Playwright framework is the only package carrying this risk.
- **Direction:** Extend the restriction to any directory barrel, or drop the per-directory `index.ts` files entirely as the client packages did, and import defining modules directly.
- **Size:** M
- **See also:** [TOOL-1](tooling.md). The barrel rule is also demoted to a warning in several packages.

### E2E-2 · The page objects address the diagram through styling classes instead of a stable contract

> Filed as [#1763](https://github.com/eclipse-glsp/glsp/issues/1763).

- **Location (as reviewed):** `e2e/workflow-e2e/src/cursors-css.ts:16-39` mirrors 21 cursor classes from `packages/client/client/src/base/feedback/css-feedback.ts:75-97` · page objects across `e2e/playwright/src/glsp/**` select tool-palette, command-palette and suggestion elements by their CSS classes · contrast `e2e/playwright/src/glsp/graph/svg-metadata-api.ts` and `packages/client/client/src/features/svg-metadata/metadata-placer.ts:27-40`
- **What's wrong:** Where a page object needs to find or assert something, it mostly reaches for a class that exists for styling, so a rename in the client breaks e2e at runtime in a suite that runs late. Two corrections to how this review first recorded it:
  - `data-svg-metadata-*` was cited as an instance of the problem. It is the opposite: a deliberate, documented tooling API (`e2e/playwright/docs/concepts/metadata.md`, a decorator API, `SVGMetadataUtils`) that most page objects already go through. It is the model to follow, not a duplication to remove. The subject is the page objects that bypass it.
  - The mirror is mostly dead. Of the 21 cursor classes in `cursors-css.ts`, **4** are exercised by any suite (`NODE_CREATION`, `EDGE_CREATION_SOURCE`, `EDGE_CREATION_TARGET`, `OPERATION_NOT_ALLOWED`). The other 17 are speculative, which is a second problem: any fix that synchronises the two tables freezes them in place.
- **Only half of it is GLSP's to fix.** The contract has four owners: the client's plain DOM (tool palette, `clicked`, command palette, `loading`) and its sprotty-rendered output (`ghost-element`, `feedback-edge`, cursor classes, `hidden`, `data-kind`) are GLSP's; `div.sprotty`, `svg.sprotty-graph`, the `sprotty_*` id scheme and `selected` belong to sprotty; `.selected` in the suggestion list and `.codicon-*` belong to the `autocompleter` library and to VS Code. The last two groups stay mirrored whatever GLSP does.
- **Direction:** Have the client expose what external tooling addresses, meaning `data-testid` for identity and ARIA or `data-*` for state, and have the page objects select those. Shrink the contract rather than synchronise it. **Both directions this finding originally proposed were built and rejected:**
  - *A dependency-free module both sides import* fails on packaging, not design. `@eclipse-glsp/playwright` is published and consumed by the VS Code and Theia integration suites, so depending on `@eclipse-glsp/client` would pin those integrations to a client version; the e2e packages ship `src` with `declarationMap`, so the tarball would carry source importing the client; and the client barrel cannot load in Node at all because of its CSS side-effect imports, which also rules out a vitest check.
  - *A characterization test asserting the two tables match* works, but it is machinery in place of a fix, it freezes the 17 unused entries, and it rests on an implicit filename convention. Note for anyone reaching for source parsing instead: TypeScript 7.0.2 is the native port, its main entry exports only `version`, and there is no `createSourceFile`.
- **Size:** M. 29 files, +558/−112, and it changes published client DOM.
- **Status:** implemented on `1761-test-attributes` (`d38cba11`), stacked on PR #19 and not merged at the time of writing: `data-testid` on the palettes and suggestions, `aria-pressed`/`aria-busy` for asserted state, the 21-entry cursor table collapsed into one `data-glsp-mode` attribute derived from the active `CursorCSS` class by an `IVNodePostprocessor` so the two cannot drift, and `e2e/playwright/docs/concepts/dom-contract.md` documenting what remains mirrored. Page objects select `[data-testid=…]` explicitly rather than via `getByTestId`, because `testIdAttribute` is global Playwright config that an integration could repoint for its own app.
- **Residual scope:** the sprotty-owned half is untouched and cannot be fixed in this repo.
- **Adjacent to:** [#1751](https://github.com/eclipse-glsp/glsp/issues/1751).

### E2E-3 · `e2e/workflow-e2e` reaches into `examples/` through a hard-coded relative filesystem path

> Filed as [#1764](https://github.com/eclipse-glsp/glsp/issues/1764).

- **Location:** `e2e/workflow-e2e/configs/webserver.config.ts:32` (`path.resolve(configDir, '..', '..', 'examples', 'workflow-standalone')`), used at `:66` to `pnpm -C` into it
- **What's wrong:** A real build-order dependency from `e2e/` to `examples/workflow-standalone` exists only as a string. It is not in `package.json`, not in tsconfig references, and invisible to `pnpm -r` ordering and to the workspace graph.
- **Direction:** Declare `workflow-standalone` as a workspace devDependency and resolve its directory from its `package.json` location. The package is `private: true`, so `workspace:*` is the only way to depend on it.
- **Size:** S

---

## What was not reviewed

The review's scope note excludes test architecture, so the following were **not** looked at and the absence of
findings below says nothing about them. If the 3.0 window is to cover e2e properly, this is what a review would need
to take on:

- **The page-object and fixture model.** `GLSPApp`, `GLSPGraph`, the `PMetadata`/decorator machinery, and whether
  the abstraction an adopter subclasses is one an adopter can actually extend.
- **The published API of `@eclipse-glsp/glsp-playwright`.** It is a released package with adopters, and no lens in
  this review examined what it exports the way [client.md](client.md) and [server.md](server.md) examined theirs.
- **Waiting and synchronization strategy.** Where the suites poll, where they rely on fixed timeouts, and how that
  interacts with the client's un-signalled model-ready state ([PROT-11](protocol.md)).
- **Coverage against the feature matrix.** Which client features have no e2e coverage at all, which matters most for
  the refactors [#1749](https://github.com/eclipse-glsp/glsp/issues/1749), [#1750](https://github.com/eclipse-glsp/glsp/issues/1750)
  and [#1754](https://github.com/eclipse-glsp/glsp/issues/1754) intend to make.
- **CI shape.** The suites now run as parallel jobs; nothing here evaluated sharding, retries or flake handling.
