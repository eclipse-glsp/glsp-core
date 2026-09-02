# AGENTS.md

## Project Overview

Eclipse GLSP Core monorepo. Consolidates the formerly separate `glsp-client`, `glsp-server-node` and `glsp` (dev packages) repositories into a single pnpm workspace. It provides the sprotty-based client framework, the TypeScript/Node server framework, the shared build tooling published under `@eclipse-glsp/*`, and the Workflow example.

Layout:

- `packages/common` — `@eclipse-glsp/protocol` (shared between client and server)
- `packages/client` — `@eclipse-glsp/sprotty`, `@eclipse-glsp/client`
- `packages/server` — `@eclipse-glsp/graph`, `@eclipse-glsp/server`, `@eclipse-glsp/layout-elk`, `@eclipse-glsp/server-mcp`
- `dev-packages` — `@eclipse-glsp/cli` and the shared config packages (ts/eslint/prettier/vitest)
- `examples` — Workflow example client, server, bundles and MCP demo

## Build & Development

- **Package manager**: pnpm — do not use yarn or npm
- **Build**: `pnpm build` from the root compiles (`tsc -b`) and bundles everything
- **Compile only**: `pnpm compile`
- **Clean**: `pnpm clean`
- **Run the example**: `pnpm dev` (client + Node server over WebSocket), `pnpm dev:browser` (server as a web worker), `pnpm dev:server:socket` (example server only, socket on 5007)
- **CLI**: `pnpm exec glsp <command>` runs the workspace-local CLI from `dev-packages/cli`
- Refer to the scripts in the root `package.json` for all available commands

## Validation

- **Tests**: `pnpm test` (Vitest, one root config with a named project per group: `common`, `client`, `server`, `dev`), scope to a group with `pnpm test:server` etc., single test: `pnpm test -t 'test name'`
- After completing any code changes, always run the `/fix` skill before reporting completion. It auto-fixes lint/format/header issues and runs the tests; manually resolve anything it could not auto-fix (remaining lint errors, test failures) and re-run it.

## Commenting Style

- **TSDoc on the public API**: document exported interfaces, types, classes, methods, and notable properties/getters with `/** … */` comments. Describe intent and behavior, not the obvious signature.
- **Cross-reference with `{@link Symbol}`** instead of writing bare type/method names in prose.
- **Document non-trivial methods** with `@param`/`@returns` (and `@throws` where relevant). Skip them for self-explanatory one-liners.
- **Deprecations** use the fixed form `/** @deprecated Use {@link Replacement} instead */`.
- **Inline `//` comments explain _why_, not _what_** — keep them short and lowercase, and reserve them for non-obvious decisions or rationale.
- **Mark known limitations** with `// FIXME:` / `// TODO:`, and justify suppressions with `// eslint-disable-next-line <rule>`.
- Don't restate code in comments; let clear naming carry the _what_.
- Copyright headers are required on every file but are handled by `/fix` — don't add them manually.

## Import Rules

These are enforced by ESLint (see `eslint.config.mjs`) and are easy to get wrong:

- **Never use relative imports** like `..`, `../index` or `src` — use package names
- **Never import `uuid` directly** — use the `generateUuid`/`isUuid` helpers re-exported by the respective package
- Common:
    - **`@eclipse-glsp/protocol`**: must NOT import from `sprotty` — use `sprotty-protocol` instead
- Client side:
    - **`@eclipse-glsp/sprotty`**: must NOT import directly from `sprotty-protocol` — use `sprotty` reexports instead
    - **`@eclipse-glsp/client`**: must NOT import directly from `sprotty`, `sprotty-protocol` or `@eclipse-glsp/protocol` — use `@eclipse-glsp/sprotty` reexports instead
    - **Client examples**: import from `@eclipse-glsp/client` only, not from the layers below it
- Server side:
    - **Never import from `sprotty-protocol` directly** — use `@eclipse-glsp/protocol` instead
    - **`@eclipse-glsp/layout-elk`, `@eclipse-glsp/server-mcp` and server examples**: consume the public `@eclipse-glsp/server` API only, not `@eclipse-glsp/protocol` or `sprotty-protocol`
