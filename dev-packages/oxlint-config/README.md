# Eclipse GLSP - Shared oxlint configuration

Common shared configuration for Eclipse GLSP components that use [oxlint](https://oxc.rs/docs/guide/usage/linter) for linting.
It replaces the former `@eclipse-glsp/eslint-config` package.

## Install

```bash
pnpm add --save-dev @eclipse-glsp/oxlint-config
```

`oxlint`, the type-aware backend `oxlint-tsgolint` and the license header plugin (`@tony.ganchev/eslint-plugin-header`) are
peer dependencies, so the configuration is not coupled to one tool version. [`@eclipse-glsp/config`](https://www.npmjs.com/package/@eclipse-glsp/config)
provides the versions GLSP uses (pinned exactly, because JS plugins and type-aware rules are outside oxlint's semver
guarantee); projects that install this package directly add the three peers themselves. The header plugin declares ESLint as a
peer dependency; package managers that auto-install peers pull ESLint in for it, but oxlint's JS plugin runtime loads the
plugin and ESLint itself is never run.

## Usage

**Create an `oxlint.config.mts` at the workspace root**:

```typescript
import glspConfig from '@eclipse-glsp/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
    extends: [glspConfig],
    // Enables the type-aware rules of the shared configuration (`typescript/no-deprecated`) via `oxlint-tsgolint`.
    // `typeCheck: true` additionally reports TypeScript compiler diagnostics, making the lint run a full static check.
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['**/lib', '**/dist', '**/*.d.ts'],
    overrides: [
        // project-specific rules, e.g. additional `no-restricted-imports` entries
    ]
});
```

**Or extend the JSON file by path from a `.oxlintrc.json`**:

```json
{
    "$schema": "./node_modules/oxlint/configuration_schema.json",
    "extends": ["./node_modules/@eclipse-glsp/oxlint-config/oxlintrc.json"],
    "options": { "typeAware": true, "typeCheck": true }
}
```

`oxlintrc.json` is the single source of truth. The default export of the package is the same configuration as a plain object,
with the copyright year of the `header/header` fix template set to the current year.

Type-aware linting and the type check resolve dependent workspace packages to their sources through the tsconfig project
references, so no build is needed before linting in a monorepo. Each package must reference the workspace packages it imports;
a missing reference surfaces as `TS2307` (cannot find module).

## Rule set

The configuration enables the ESLint and typescript-eslint recommended rules that oxlint implements, the GLSP coding rules
(`eqeqeq`, `one-var`, `no-restricted-imports` for barrel and `src` imports, the EPL license header, ...),
and a small set of warnings (`no-shadow`, `typescript/explicit-function-return-type`, `typescript/no-deprecated`,
`import/no-duplicates`, `import/no-named-as-default`).

Compared with the former ESLint configuration the following rules were dropped deliberately:

- All `@stylistic/*` rules, `eslint-config-prettier` and `curly`: the formatter (`@eclipse-glsp/oxfmt-config`) owns formatting,
  and `curly` had been neutralised by `eslint-config-prettier` already.
- `import-x/no-unresolved`, `import-x/namespace`, `import-x/export`, `import-x/named`, `import-x/default`: the TypeScript
  compiler reports all of these.
- `spaced-comment`, `no-return-await`, `no-invalid-this`: deprecated in ESLint or covered by `strict` mode.
- `eslint-plugin-no-null`: removed without replacement. It had to be disabled wherever code meets APIs that use `null`
  explicitly (the DOM, Playwright, JSON-RPC), which outweighed the benefit of the rule.
- `import-x/no-deprecated`: replaced by the type-aware `typescript/no-deprecated`, which is checker-exact. Because it also
  reports in-package uses of members kept for backwards compatibility, consider turning it off for the packages that define
  the deprecated API and keeping it on for their consumers.
- `no-void`: `void promise` is the idiom `typescript/no-floating-promises` accepts for intentional fire-and-forget calls.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
