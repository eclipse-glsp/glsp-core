# Eclipse GLSP - Client

A web-based diagram client framework for the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp) based on [Eclipse Sprotty](https://github.com/eclipse/sprotty).

## Building

This project is built with `pnpm` and is available from npm via [@eclipse-glsp/client](https://www.npmjs.com/package/@eclipse-glsp/client).

## Configuring features

A diagram container is composed of the `DEFAULT_FEATURES` and the configuration passed to `initializeDiagramContainer`.
Each feature has a stable key in `GLSPClientFeature` (e.g. `glsp.toolPalette`) and is loaded lazily: the configuration is resolved first, and only the features that are part of the result are imported and loaded.
A removed feature's module is never evaluated, so neither its registration code nor its stylesheet imports run.

> **Note:** The package is currently published as CommonJS, where the lazy `import()`s compile to `require` calls.
> Bundlers therefore still include the code of removed features in the bundle, so removing a feature does not reduce the bundle size yet.

```typescript
const container = await initializeDiagramContainer(
    new Container(),
    myDiagramModule,
    {
        // remove a default feature without importing its implementation
        remove: GLSPClientFeature.ToolPalette,
        // replace a default feature with a lazily loaded implementation under the same key
        replace: defineFeature(GLSPClientFeature.SourceModelWatcher, () => import('./my-watcher-module').then(m => m.myWatcherModule)),
        // add an optional or custom feature
        add: [
            GLSPOptionalFeatures.Grid,
            defineFeature('myCompany.simulation', () => import('./simulation-module').then(m => m.simulationModule))
        ]
    },
    STANDALONE_MODULE_CONFIG
);
```

Dependencies are declared on the feature definition:

- `requires`: the feature can't work without the other feature. If the other feature isn't configured, resolution fails with a `FeatureResolutionError`.
- `extends`: the feature augments the other feature (like the standalone features do). If the other feature is removed, this feature is dropped silently.

Define a feature in a small definition file without implementation imports, and let the module derive its feature id and load-time requirements from it, so that the key and the dependencies are only declared once:

```typescript
// simulation-feature.ts
export const simulationFeatureDef = defineFeature(
    'myCompany.simulation',
    () => import('./simulation-module').then(m => m.simulationModule),
    { requires: GLSPClientFeature.Select }
);

// simulation-module.ts
export const simulationModule = new FeatureModule(bind => {
    // ...
}, FeatureDefinition.toModuleOptions(simulationFeatureDef));
```

The `GLSPClientFeature.Default` feature is required by every diagram container and always loaded first, so a replacement must not declare `requires` or `extends`.
Removing a key that is not configured (e.g. a misspelled key or a sprotty key such as `GLSPClientFeature.EdgeEdit` that isn't a default feature) has no effect and logs a warning.

Resolution also fails on duplicate feature ids (use `replace` instead of `add`) and on dependency cycles.
A feature may be configured both as definition and as the module object it loads (e.g. `GLSPOptionalFeatures.Grid` and `gridModule`); it is then loaded once.
Required and extended features are always loaded first.

### Feature keys

Feature keys are namespaced strings (`FeatureKey`). The `glsp.` namespace (`GLSPFeatureKey`) is reserved for GLSP.
Every layer defines its keys in one root registry, and each registry includes the layer below it:

| Registry                | Package                  | Contents                                                                             |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `GLSPCapability`        | `@eclipse-glsp/protocol` | Features the server reports as capabilities                                          |
| `GLSPServerFeature`     | `@eclipse-glsp/server`   | `GLSPCapability` plus the server core features                                       |
| `SprottyFeature`        | `@eclipse-glsp/sprotty`  | The wrapped sprotty modules                                                          |
| `GLSPClientFeature`     | `@eclipse-glsp/client`   | `SprottyFeature` plus all GLSP client features                                       |
| `GLSPStandaloneFeature` | `@eclipse-glsp/client`   | The standalone features (`STANDALONE_FEATURES`), defined next to `GLSPClientFeature` |

Adopters define their own registry in their own namespace:

```typescript
export const MyFeature = { Simulation: 'myCompany.simulation' } as const satisfies Record<string, FeatureKey>;
```

### Migrating from module objects

| Before                                                                        | After                                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `const container = initializeDiagramContainer(c, ...config);`                 | `const container = await initializeDiagramContainer(c, ...config);`                                                      |
| `{ remove: toolPaletteModule }`                                               | `{ remove: GLSPClientFeature.ToolPalette }` (removing by module object still works)                                      |
| `{ replace: myToolPaletteModule }`                                            | `{ replace: defineFeature(GLSPClientFeature.ToolPalette, () => import('./my-module').then(...)) }`                       |
| `new FeatureModule(registry, { featureId: Symbol('myFeature') })`             | `new FeatureModule(registry, { featureId: FeatureKey.toId('myCompany.myFeature') })`                                     |
| `new FeatureModule(registry, { requires: otherModule })`                      | `new FeatureModule(registry, { requires: 'myCompany.other' })`                                                           |
| `DEFAULT_MODULES` / `STANDALONE_MODULES`                                      | `DEFAULT_FEATURES` / `STANDALONE_FEATURES`                                                                               |
| `{ remove: elementTemplateModule }` silently skipped `nodeCreationToolModule` | Fails with a `FeatureResolutionError`: also remove `GLSPClientFeature.NodeCreationTool` (same for `Bounds` and `Zorder`) |
| `accessibilityModule`, `gridModule`, `helperLineModule`, `debugModule`        | `GLSPOptionalFeatures.Accessibility`, `.Grid`, `.HelperLine`, `.Debug` (module objects still work)                       |
| `buttonModule`, `fadeModule`, `expandModule`, … (wrapped sprotty modules)     | `sprottyButtonModule`, `sprottyFadeModule`, `sprottyExpandModule`, …                                                     |

Existing `replace` configurations with eagerly imported modules keep working, as long as the replacement uses the feature id of the default feature (`FeatureKey.toId(GLSPClientFeature.X)`).

Removing a feature that another configured feature `requires` is now an error instead of silently skipping the dependent feature.
In the defaults, `NodeCreationTool` requires `ElementTemplate` and `Zorder` requires `Bounds`.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).

![alt](https://www.eclipse.org/glsp/images/diagramanimated.gif)
