# Eclipse GLSP - Shared configuration

Common shared configuration for Eclipse GLSP components that are implemented with Typescript.
Provides a meta package that export common configuration objects for:

- [Typescript](https://www.typescriptlang.org/) (`tsconfig.json`)
- [oxlint](https://oxc.rs/docs/guide/usage/linter) (`oxlint.config.mts`)
- [oxfmt](https://oxc.rs/docs/guide/usage/formatter) (`oxfmt.config.mts`).

The package is available via npm and is used by all GLSP components implemented with Typescript.
oxlint and oxfmt are included as transitive dependencies of the configuration packages.

## Components

- [`@eclipse-glsp/ts-config`](https://www.npmjs.com/package/@eclipse-glsp/ts-config): Shared Typescript configuration for GLSP projects
- [`@eclipse-glsp/oxlint-config`](https://www.npmjs.com/package/@eclipse-glsp/oxlint-config): Shared oxlint configuration for GLSP projects
- [`@eclipse-glsp/oxfmt-config`](https://www.npmjs.com/package/@eclipse-glsp/oxfmt-config): Shared oxfmt configuration for GLSP projects

## Install

```bash
pnpm add --save-dev @eclipse-glsp/config
```

## Usage

### TSConfig

**Create a `tsconfig.json`**:

```json
{
    "extends": "@eclipse-glsp/ts-config",
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "lib"
    }
}
```

### oxlint

**Create an `oxlint.config.mts` at the workspace root**:

```typescript
import glspConfig from '@eclipse-glsp/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
    extends: [glspConfig],
    // Enables the type-aware rules of the shared configuration (requires `oxlint-tsgolint`, a dependency of the config package)
    options: { typeAware: true },
    ignorePatterns: ['**/lib', '**/dist', '**/*.d.ts']
});
```

Projects that prefer a JSON configuration can extend the shared rules by path in a `.oxlintrc.json`:

```json
{
    "$schema": "./node_modules/oxlint/configuration_schema.json",
    "extends": ["./node_modules/@eclipse-glsp/oxlint-config/oxlintrc.json"],
    "options": { "typeAware": true }
}
```

### oxfmt

**Create an `oxfmt.config.mts` at the workspace root**:

```typescript
import shared from '@eclipse-glsp/oxfmt-config' with { type: 'json' };
import { defineConfig } from 'oxfmt';

export default defineConfig({
    ...shared,
    ignorePatterns: ['lib/', 'dist/']
});
```

Format with `oxfmt` and verify with `oxfmt --check`.

### Testing

The test configuration is not part of this package.
Add [`@eclipse-glsp/config-test`](https://www.npmjs.com/package/@eclipse-glsp/config-test) for the shared [Vitest](https://vitest.dev) configuration and dependencies, or [`@eclipse-glsp/dev`](https://www.npmjs.com/package/@eclipse-glsp/dev) for both plus the GLSP CLI.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
