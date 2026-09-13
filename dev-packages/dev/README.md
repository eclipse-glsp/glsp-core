# Eclipse GLSP - All-in-one dev package

A meta package that includes all shared configuration packages Eclipse GLSP components.
In addition, it also provides the GLSP CLI application.

The package is available via npm and can be used by all GLSP components implemented with Typescript.

## Components

- [`@eclipse-glsp/config`](https://www.npmjs.com/package/@eclipse-glsp/config): Meta package for shared build configuration
    - [`@eclipse-glsp/ts-config`](https://www.npmjs.com/package/@eclipse-glsp/ts-config): Shared Typescript configuration for GLSP projects
    - [`@eclipse-glsp/oxlint-config`](https://www.npmjs.com/package/@eclipse-glsp/oxlint-config): Shared oxlint configuration for GLSP projects
    - [`@eclipse-glsp/oxfmt-config`](https://www.npmjs.com/package/@eclipse-glsp/oxfmt-config): Shared oxfmt configuration for GLSP projects
- [`@eclipse-glsp/config-test`](https://www.npmjs.com/package/@eclipse-glsp/config-test): Meta package for shared test configuration
    - [`@eclipse-glsp/mocha-config`](https://www.npmjs.com/package/@eclipse-glsp/mocha-config): Shared Mocha configuration for GLSP projects
    - [`@eclipse-glsp/nyc-config`](https://www.npmjs.com/package/@eclipse-glsp/nyc-config): Shared nyc configuration for GLSP projects
- [`@eclipse-glsp/cli`](https://www.npmjs.com/package/@eclipse-glsp/cli): CLI Tooling & scripts for GLSP projects

## Install

```bash
pnpm add --save-dev @eclipse-glsp/dev
```

## Usage

### TSConfig

**Create a `tsconfig.json`**:

```json
{
    "extends": "@eclipse-glsp/ts-config/tsconfig.json",
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "lib"
    }
}
```

In addition, a custom configuration for projects that use `mocha` is available:

- `@eclipse-glsp/ts-config/mocha`

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

### Mocha

**Create a `.mocharc`**:

```json
{
    "$schema": "https://json.schemastore.org/mocharc",
    "extends": "@eclipse-glsp/mocha-config"
}
```

### Nyc

**Add a `.nycrc` to your project root**:

```json
{
    "extends": "@eclipse-glsp/nyc-config"
}
```

Configuration can also be provided by `nyc.config.js` if programmed logic is required.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
