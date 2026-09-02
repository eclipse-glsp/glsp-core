# Eclipse GLSP-Playwright Example

This package contains code examples that demonstrate how to test diagram editors using the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp).

<details>
  <summary>Expand test list</summary>
  
| Feature                                                                              |      Standalone      | Theia Integration | VS Code Integration |
| ------------------------------------------------------------------------------------ | :------------------: | :---------------: | :-----------------: |
| Model Saving                                                                         |          -           |         -         |          -          |
| Model Dirty State                                                                    |                      |         -         |          -          |
| Model SVG Export                                                                     |          -           |         -         |          -          |
| Model Layout                                                                         |          -           |         -         |          -          |
| Restoring viewport on re-open                                                        |                      |         -         |                     |
| Model Edit Modes<br>- Edit<br>- Read-only                                            |   <br>-<br>-&nbsp;   |    <br>-<br>-     |  <br>-<br>-&nbsp;   |
| Client View Port<br>- Center<br>- Fit to Screen                                      |      <br>-<br>-      |    <br>-<br>-     |     <br>-<br>-      |
| Client Status Notification                                                           |          -           |         -         |          -          |
| Client Message Notification                                                          |          -           |         -         |          -          |
| Client Progress Reporting                                                            |                      |         -         |          -          |
| Element Selection                                                                    |          ✓           |         ✓         |          ✓          |
| Element Hover                                                                        |          ✓           |         ✓         |          ✓          |
| Element Validation                                                                   |          ✓           |         ✓         |          ✓          |
| Element Navigation                                                                   |          ✓           |         ✓         |          x          |
| Element Type Hints                                                                   |          ✓           |         ✓         |          ✓          |
| Element Creation and Deletion                                                        |          ✓           |         ✓         |          ✓          |
| Node Change Bounds<br>- Move<br>- Resize                                             |      <br>✓<br>✓      |    <br>✓<br>✓     |     <br>✓<br>✓      |
| Node Change Container                                                                |          -           |         -         |          -          |
| Edge Reconnect                                                                       |          ✓           |         ✓         |          ✓          |
| Edge Routing Points                                                                  |          ✓           |         ✓         |          ✓          |
| Ghost Elements                                                                       |          -           |         -         |          -          |
| Element Text Editing                                                                 |          ✓           |         ✓         |          ✓          |
| Clipboard (Cut, Copy, Paste)                                                         |          -           |         -         |          -          |
| Undo / Redo                                                                          |          ✓           |         ✓         |          x          |
| Contexts<br>- Context Menu<br>- Command Palette<br>- Tool Palette                    |    <br><br>-<br>-    |  <br>-<br>-<br>-  |   <br>-<br>-<br>-   |
| Accessibility Features (experimental) <br>- Search<br>- Move <br>- Zoom <br>- Resize | <br>-<br>-<br>-<br>- |                   |                     |
| Helper Lines (experimental)                                                          |          -           |         -         |          -          |

</details>

## Prerequisites

The following libraries/frameworks need to be installed on your system:

- [Node.js](https://nodejs.org/en/) `>=22.18`
- [pnpm](https://pnpm.io/installation) `>=11`

Everything under test comes from this workspace.
[`examples/workflow-standalone`](../../examples/workflow-standalone) provides the diagram client
and [`examples/workflow-server`](../../examples/workflow-server) the Workflow GLSP server.
Playwright starts both. There is no repository to clone and nothing else to set up.

The Theia and VS Code integrations are tested in
[`glsp-theia-integration`](https://github.com/eclipse-glsp/glsp-theia-integration) and
[`glsp-vscode-integration`](https://github.com/eclipse-glsp/glsp-vscode-integration), which reuse
the suites from this package.

## Structure

- [./src](./src/): The page objects and reusable test suites for the `Workflow Example`, exported
  through `src/index.ts` so that integration packages can reuse and customize them.
- [./tests](./tests/): The single entry point that registers the complete reusable contract for
  the standalone projects.
- [./configs](./configs/): The Playwright configuration, split into parts that the integration
  packages share (`base.config.ts`, `env.ts`) and the standalone specific ones
  (`project.config.ts`, `webserver.config.ts`).
- [playwright.config.ts](./playwright.config.ts): The entry point Playwright loads. The
  [Playwright documentation](https://playwright.dev/docs/test-configuration) lists the options.

### Shared tests

The test bodies live in reusable suite factories under [./src/test/suites](./src/test/suites/).
Each test case has a stable identifier. An integration customizes the suites when it registers
them. It can replace the title and body of a single case, wrap the exported default case inside
`run` to extend it, or skip individual cases and whole suites. A skipped case declares no
fixtures, so the integration never starts for it.

```ts
import { defineWorkflowSuites, test } from '@eclipse-glsp-examples/workflow-e2e';

defineWorkflowSuites(test, {
    labelEditTool: {
        cases: {
            renameByKeyboard: {
                title: 'should allow nodes to be renamed with the platform keybinding',
                run: async ({ app }) => { ... }
            }
        }
    },
    markerNavigator: { skip: 'The integration has no support for marker navigation' }
});
```

Prefer a capability interface over an override when the difference is a platform capability rather
than a quirk of one integration. A shared case can branch on `ContextMenuIntegration.is(integration)`
or resolve its key binding through `provideDiagramShortcut(integration, ...)`. That keeps both
sides of the assertion in the suite instead of splitting them across an override. See
[integration.md](../playwright/docs/concepts/integration.md#capability-interfaces).

Integration-specific cases need no dedicated mechanism. They are plain Playwright tests in the
integration repository's own spec files.

The aggregate function is the integration contract. It registers every shared suite by default, so
updating `@eclipse-glsp-examples/workflow-e2e` picks up newly published suites. An integration only
configures case-level differences and marks unsupported suites with a `skip` reason, which keeps
them visible in test discovery and reports.

Playwright still executes a local test entry point. Integration repositories do not load compiled
spec files from this package. The reusable suites depend only on `@eclipse-glsp/playwright`, so
they do not tie this package to Theia or VS Code.

The shared suite factory declares every case with `test(...suite.args('caseId'))`, so each case
keeps its own Playwright source location for reports and IDE navigation. An overridden case still
points at the shared declaration rather than the integration-specific body. That is the intended
trade-off for stable, per-case Playwright locations.

## Running the tests

The tests run against the built bundles of the workspace, so build first. The `test` script
downloads the Chromium build on demand through `pnpm browsers`. `pnpm install` does not, which
keeps a plain workspace install small for everyone who never runs the e2e tests.

```bash
pnpm build                             # in the repository root
```

From the repository root:

```bash
pnpm test:e2e                          # both projects
pnpm test:e2e:standalone               # Node/WebSocket server only
pnpm test:e2e:standalone-browser       # web-worker server only
```

The same commands without the `pnpm build` step are available inside this package:

```bash
pnpm test
pnpm test:standalone
pnpm test:standalone-browser
```

Both projects exercise the same suites against a different server setup:

| Project              | Client                               | GLSP server                                   |
| -------------------- | ------------------------------------ | --------------------------------------------- |
| `standalone`         | `workflow-standalone` (Node mode)    | `workflow-server` over WebSocket, port 8081   |
| `standalone-browser` | `workflow-standalone` (browser mode) | compiled to a web worker, no separate process |

Playwright starts the required web servers itself via the `workflow-standalone` `start` script.

## Configuration

All settings have defaults and need no configuration. To override them, copy
[`e2e/.env.example`](../.env.example) to `e2e/.env`, which is git-ignored, or set the variables in
your shell.

| Variable                  | Default | Purpose                                                         |
| ------------------------- | ------- | --------------------------------------------------------------- |
| `GLSP_SERVER_PORT`        | `8081`  | Port of the Workflow GLSP server in Node mode                   |
| `STANDALONE_PORT`         | `8082`  | Port of the `standalone` client                                 |
| `STANDALONE_BROWSER_PORT` | `8083`  | Port of the `standalone-browser` client                         |
| `GLSP_SERVER_TYPE`        | `node`  | Server implementation the assertions expect: `node` or `java`   |
| `GLSP_SERVER_EXTERNAL`    | unset   | Set to `true` to run against a GLSP server you started yourself |

### Running against the Java server

The [Java Workflow server](https://github.com/eclipse-glsp/glsp-server) lives in a separate
repository and is never started by Playwright. Start it yourself on `GLSP_SERVER_PORT`, then run
the `standalone` project with `GLSP_SERVER_TYPE=java` so that the suites assert the labels and
popup texts of the Java server:

```bash
GLSP_SERVER_TYPE=java pnpm test:standalone
```

That configuration skips `standalone-browser`, because the web-worker server exists only for the
Node implementation.

## Development

Run `pnpm watch` in this package, or `pnpm compile --watch` in the repository root, to rebuild the
sources, including the test files, while editing.

`pnpm generate:index` in the repository root generates the `index.ts` barrels. Run it after adding
or moving a source file. The generator owns the `suites` barrel, so the suite aggregator
(`defineWorkflowSuites`, `defineStandaloneWorkflowSuites`, `WorkflowSuiteName`) lives in
[`src/test/suites/workflow-suites.ts`](./src/test/suites/workflow-suites.ts) instead.

## Debugging

1. Read the [Playwright Debug Documentation](https://playwright.dev/docs/debug).
2. Install the VSCode Playwright Extension.

### Live debugging

- Read the [Live Debugging Documentation](https://playwright.dev/docs/debug#live-debugging)
- You can get the locator of a specific page object or a `GLSPLocator` by using the `.locate()` method:

```ts
const locator = task.locate();
```

- Click on the locator variable to highlight it within the browser

### Extractors

The Playwright debugger is the recommended way to debug the test cases. For more context, this
package also offers utility functions that extract information from the page objects. See the
[debug suite](./src/test/suites/core/debug.standalone.suite.ts) for examples and usage notes.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
