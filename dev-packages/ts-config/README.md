# Eclipse GLSP - Shared Typescript configuration

Common shared configuration for Eclipse GLSP components that are based on Typescript.

## Install

```bash
pnpm add --save-dev @eclipse-glsp/ts-config
```

## Usage

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

The package ships a single configuration (`tsconfig.json`), which is also its `main` entry, so `"extends": "@eclipse-glsp/ts-config"` and `"extends": "@eclipse-glsp/ts-config/tsconfig.json"` are equivalent.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
