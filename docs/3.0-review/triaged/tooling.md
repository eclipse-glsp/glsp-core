# Build, lint and packaging: workspace and `dev-packages/*`

Covers the workspace-level configuration that every package depends on: `oxlint.config.mts`, `pnpm-workspace.yaml`,
`vite.config.ts`, the root `package.json` scripts, and each product package's published entry points.

**1 finding.** Build and dev tooling were deliberately excluded from this review's scope, because none of it needs a
major version boundary. This one is in only because it is the reason other findings are invisible: the layering rules
are unenforced. Two others were [withdrawn](#withdrawn) on review. `dev-packages/cli` and the other dev packages were
**not** reviewed at all (see [What was not reviewed](#what-was-not-reviewed)).

**Triage is complete.** [TOOL-1](#tool-1--the-layering-rules-are-warnings-only-the-generic-barrel-ban-is-an-error) is
filed as [#1784](https://github.com/eclipse-glsp/glsp/issues/1784), a sub-issue of
[#1744](https://github.com/eclipse-glsp/glsp/issues/1744). It does not need the major-version boundary, and
`oxlint -D warning .` currently exits 0 across the repo, so flipping the severity costs nothing today. `TOOL-2` went
to [#1740](https://github.com/eclipse-glsp/glsp/issues/1740) and `TOOL-3` was withdrawn outright. The candidate issues
in the appendix are **not** triaged and are still worth a pass.

See [index.md](../index.md) for scope, the coverage register and the mapping from the previous `A1` to `A7` finding ids.

---

## Findings

### TOOL-1 · The layering rules are warnings; only the generic barrel ban is an error

> Filed as [#1784](https://github.com/eclipse-glsp/glsp/issues/1784).

- **Location:** `oxlint.config.mts:87,113,134,147,162,188,203`, where every product-package `no-restricted-imports` override starts with `'warn'`, while `:221` uses `'error'` · base rule at `dev-packages/oxlint-config/oxlintrc.json:62` (`["error", "..", "../index", "../..", "../../index", "src"]`) · the mechanism is stated in the config's own comment at `oxlint.config.mts:20` ("an override replaces the entire rule value") · `package.json:42` (`"lint": "oxlint ."`, no `--deny-warnings`) · `scripts/lint-report.mjs:101` (`process.exit(errors > 0 ? 1 : 0)`)
- **What's wrong:** Because an override replaces the whole rule value, every override that adds a Sprotty/protocol/uuid restriction also _demotes the inherited `error`-level barrel ban to `warn`_ in that package. The Sprotty seam, the protocol boundary and the barrel ban are therefore all non-blocking, and a new `import … from 'sprotty'` inside `packages/client/client` leaves both `pnpm lint` and `pnpm lint:ci` passing.
- **Direction:** Make the overrides `'error'`, or drop the severity re-declaration so the base severity is inherited.
- **Size:** S
- **Why it matters beyond lint:** this is the enforcement half of [CL-1](client.md), [SRV-29](server.md) and [E2E-1](e2e.md). Writing the intended layering down (see [index.md](../index.md#note-on-the-repositorys-own-documentation)) is the other half.

---

## Withdrawn

**Every package's build scripts depend on dev tooling none of them declare** (the previous `TOOL-3`). The claim was
that `generate:index`, `clean` and `test` resolve the `glsp` and `rimraf` binaries through unintended hoisting, and
that each package should declare `@eclipse-glsp/dev` itself.

It does not hold. pnpm puts both the package's own `node_modules/.bin` **and** the workspace root's on `PATH` for
every script it runs, so a root-level tooling dependency is how a pnpm monorepo is meant to work. The
`publicHoistPattern` entries for `@eclipse-glsp/cli` and `rimraf` (`pnpm-workspace.yaml`) exist because those are
transitive dependencies of the root's `@eclipse-glsp/dev` and would otherwise get no root `.bin` link. That is
deliberate configuration, and the file says so in a comment. Declaring the tooling in 11 more `package.json` files would add
version-sync work against a convention that centralises tooling on purpose, and nothing in this repo runs a package's
scripts outside the workspace.

**Package entry points are stub files and a non-standard `browser` field** (the previous `TOOL-2`). It recorded that
`packages/server/server/package.json:48-52` declares `"main": "./lib/node/index"` with `"types": "lib/common/index"`,
that the `browser` key omits the `./` prefix and extension its convention requires, that subpaths are served by root
stub files, and that no product package has an `exports` map.

[#1740](https://github.com/eclipse-glsp/glsp/issues/1740) owns the work. Moving to ESM forces real `exports`, so this
is not a decision that can be sequenced separately. That issue already lists "Define `exports` for Node, browser, and
common entry points without breaking the browser server build" and "Replace CommonJS forwarding files", which is the
whole of this finding's direction, and its problem statement names the same `node.js`/`browser.js`/`common.js`
forwarding files.

One observation here is not in that issue's text and is worth carrying into it when it is picked up: the `browser`
key's target is written `lib/node/index`, without the `./` prefix or the extension the field's convention calls for
(compare `vscode-jsonrpc`'s `"./lib/node/main.js"`). It resolves today because the bundlers in use are lenient about
it, which is worth knowing before the field is replaced by `exports` conditions.

The finding also claimed that `main` pointing at the node entry while `types` points at the common one was a mismatch.
It is not. `src/node/reexport.ts` and `src/browser/reexport.ts` are both `export * from '../common'`, so each runtime
is common plus its own platform additions, and typing the bare import as common gives a consumer the portable
intersection with the platform-correct runtime selected by the `browser` field. Platform-specific API is reached
through the `/node` and `/browser` subpaths, which ship their own declarations. The arrangement is deliberate and
sound; that it is written down nowhere is [X-14](cross-cutting.md), not a packaging defect.

---

## What was not reviewed

`dev-packages/*`, meaning `cli`, `dev`, `config`, `config-test`, `ts-config`, `vitest-config`, `oxlint-config` and
`oxfmt-config`, carries **no findings** in this review. It was out of scope, because none of it needs a major-version
boundary to change and the 3.0 window is better spent where the boundary is required.

That is a scope decision, not a statement that the area is sound. A review of it would need to look at:

- **`@eclipse-glsp/cli`'s public API.** It is a published, adopter-facing binary (`glsp checkHeaders`,
  `generate:index`, the release commands) and nothing here examined its commands, flags or stability guarantees.
- **The generated barrels.** `generate:index` produces `packages/client/client/src/index.ts` and its siblings; the
  barrel shape is [#1740](https://github.com/eclipse-glsp/glsp/issues/1740)'s, but the generator's rules for what it
  includes were not assessed.
- **The shared config packages as a contract.** Adopters extend `ts-config`, `oxlint-config` and `vitest-config`;
  what they may rely on across a major version is unstated.
- **Header checking.** `headers:check` misses a licence header with source code spliced into it (see the
  [client appendix](client.md#runtime)), which suggests the check is line-count- or prefix-based rather than
  structural.
- **The release and publishing pipeline**, which this review did not touch at all.

---

## Appendix: candidate issues

Not findings. Each item is either too small to warrant one, or needs a decision before it can be scoped.
Nothing here duplicates a finding: where an observation turned out to belong to one, it was folded into that
finding instead.

- Example lint globs are enumerated by package name (`oxlint.config.mts:26-27`), so a newly added example package silently gets no import restrictions at all; the same holds for any new package under `packages/common/`, where only `packages/common/protocol/src/**` is covered.
- `vite.config.ts:31-45` defines test projects for `packages/*` and `dev-packages/*` only, so an `examples/**/*.spec.ts` would never run. `examples/` currently has zero specs, which is likely why nobody noticed.
- `examples/workflow-server-mcp-demo/src/index.js` is excluded from lint by the blanket `'**/*.js'` ignore and absent from the tsconfig `references`. See the [examples appendix](examples.md#appendix-candidate-issues).
