# Eclipse GLSP - Shared oxfmt configuration

Common shared configuration for Eclipse GLSP components that use [oxfmt](https://oxc.rs/docs/guide/usage/formatter) for code formatting.
It replaces the former `@eclipse-glsp/prettier-config` package and produces the same output for the Prettier options GLSP used
(single quotes, no trailing commas, `printWidth` 140 / `tabWidth` 4, narrower two-space JSON and YAML).

`sortPackageJson` is enabled: oxfmt sorts `package.json` keys with its own algorithm, which replaces the former
`prettier-plugin-packagejson` (the order differs slightly, e.g. `keywords` are sorted and `repository` follows `contributors`).

## Install

```bash
pnpm add --save-dev @eclipse-glsp/oxfmt-config
```

`oxfmt` is a peer dependency, so the configuration is not coupled to one formatter version.
[`@eclipse-glsp/config`](https://www.npmjs.com/package/@eclipse-glsp/config) provides the version GLSP uses (pinned exactly
while oxfmt is 0.x); projects that install this package directly add `oxfmt` themselves.

## Usage

oxfmt has no `extends` mechanism for JSON configs. Create an `oxfmt.config.mts` at the workspace root that spreads the shared
options and adds project-specific settings such as ignore patterns:

```typescript
import shared from '@eclipse-glsp/oxfmt-config' with { type: 'json' };
import { defineConfig } from 'oxfmt';

export default defineConfig({
    ...shared,
    ignorePatterns: ['lib/', 'dist/']
});
```

Then format with `oxfmt` and verify with `oxfmt --check`. The `.mts` extension keeps Node.js from re-parsing the file in
CommonJS workspaces; TypeScript config files need Node.js 22.18 or newer, on older runtimes use an `oxfmt.config.mjs` with the
same content.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
