# Integration

GLSP supports different tool platforms such as Eclipse Theia and VS Code, and also runs in web applications or standalone. See the [GLSP documentation](https://www.eclipse.org/glsp/documentation/integrations/). This page covers the integrations that the GLSP-Playwright framework provides for them.

---

In the GLSP-Playwright framework, an Integration is the code that makes a GLSP-Client-Integration usable from the Playwright context.

The GLSP-Client runs in browsers and browser-like environments such as Electron, so Playwright can reach the DOM and drive its elements directly. Some GLSP-Client-Integrations need setup first, or change how Playwright behaves while they run. In Electron, for example in VS Code, the application has to start before the test can attach. These GLSP-Client-Integrations currently have a matching GLSP-Playwright-Integration.

|           | Page | Standalone | Eclipse Theia | VS Code | Eclipse IDE |
| --------- | ---- | ---------- | ------------- | ------- | ----------- |
| Supported | Yes  | Yes        | Yes           | Yes     | No          |

## GLSP-Playwright-Integrations

A GLSP-Playwright-Integration has access to Playwright's `Page` object and to the integration-specific `options` from the Playwright configuration. Because integrations are constructed and run before any test case, an integration can add its own parameters and setup logic there. Integrations are optional: `GLSPApp` works without one, and you then pass the `Page` object to it directly.

### Page-Integration

The `Page-Integration` changes nothing about Playwright's behavior, so tests behave exactly as they would in plain Playwright. Passing Playwright's `Page` object directly to `GLSPApp` has the same effect.

### Standalone-Integration

The `Standalone-Integration` should be used for web applications. It has a required `Options` configuration, where the developer has to provide the URL to the running web application. The integration will automatically open the browser and load the URL before any test case and wait until the GLSP-Client is ready (e.g., the graph has been rendered).

### Theia- and VSCode-Integration

These live in separate packages, [`@eclipse-glsp/playwright-theia`](https://www.npmjs.com/package/@eclipse-glsp/playwright-theia) and [`@eclipse-glsp/playwright-vscode`](https://www.npmjs.com/package/@eclipse-glsp/playwright-vscode), so that a consumer only pulls in the tool platform it actually tests. They are maintained and released with the platform integrations they test, in [`glsp-theia-integration`](https://github.com/eclipse-glsp/glsp-theia-integration/tree/master/e2e/playwright-theia) and [`glsp-vscode-integration`](https://github.com/eclipse-glsp/glsp-vscode-integration/tree/master/e2e/playwright-vscode). Install the one you need alongside `@eclipse-glsp/playwright`.

## Selecting an integration

An integration is selected through the `integrationOptions` test option in the Playwright configuration. Always create the options with the `define*Integration()` helper of the owning package:

```ts
import { defineStandaloneIntegration } from '@eclipse-glsp/playwright';
import { defineTheiaIntegration } from '@eclipse-glsp/playwright-theia';

export default {
    projects: [
        {
            name: 'standalone',
            use: { integrationOptions: defineStandaloneIntegration({ url: 'http://localhost:8082/diagram.html' }) }
        },
        {
            name: 'theia',
            use: { integrationOptions: defineTheiaIntegration({ url: 'http://localhost:3000', widgetId: 'workflow-diagram' }) }
        }
    ]
};
```

The `integration` fixture then builds the integration and hands it to the test. Tests stay independent of the integration and keep importing `test` and `expect` from `@eclipse-glsp/playwright`.

The helper does more than save typing. The options it returns carry the factory that creates the integration, which is what lets an integration live in its own package without the core framework importing it. That is also why the compiler rejects a hand-written `{ type: 'Theia', ... }` literal.

## Contributing an integration

To add an integration from another package:

1. Extend `Integration` and implement any [capability interface](#capability-interfaces) your platform supports.
2. Declare an options interface extending `BaseIntegrationOptions` with a literal `type` and a required `integrationFactory`.
3. Register the options type by merging into the global options map, which is what adds the new discriminator to `IntegrationType` and `IntegrationOptions`:

    ```ts
    declare global {
        namespace GLSPPlaywright {
            interface IntegrationOptionsMap {
                MyPlatform: MyPlatformIntegrationOptions;
            }
        }
    }
    ```

    Use the global namespace, not `declare module '@eclipse-glsp/playwright'`. The map is declared inside the package and only re-exported by its barrel. TypeScript cannot merge into a re-exported declaration; it would silently create an unrelated interface instead.

4. Export a `defineMyPlatformIntegration()` helper that fills in `type` and `integrationFactory`.

## Capability interfaces

A capability interface declares that an integration supports a feature the framework drives, or that
it drives it differently than the plain GLSP-Client does. Each one lives next to the feature it
belongs to, under `glsp/features/<feature>/<feature>.integration.ts`, and is exported from the
package root:

| Capability                   | Feature folder               | Resolved through         |
| ---------------------------- | ---------------------------- | ------------------------ |
| `ContextMenuIntegration`     | `features/context-menu`      | `GLSPApp.contextMenu`    |
| `DiagramShortcutIntegration` | `features/keyboard-shortcut` | `provideDiagramShortcut` |
| `MarkerNavigatorIntegration` | `features/validation`        | `provideMarkerNavigator` |
| `UndoRedoIntegration`        | `features/undo-redo`         | `provideUndoRedoTrigger` |

Implement the matching interface instead of branching on the integration type in a test. Shared
tests then either pick the variant up through the `provide*` helper, or branch on
`<Capability>.is(integration)` where the two behaviors differ. Either way they stay free of any
platform import.

`provideUndoRedoTrigger` and `provideDiagramShortcut` use the client key bindings when an
integration does not implement their capability. Marker navigation is stricter.
`provideMarkerNavigator` requires an explicit capability, because host applications can reserve
its keys. The Page, Standalone and Theia integrations provide one, VS Code currently does not.
`ContextMenuIntegration` has no default at all. `GLSPApp.contextMenu` is a stub that throws for
integrations without a context menu, so tests must guard with `ContextMenuIntegration.is`.
