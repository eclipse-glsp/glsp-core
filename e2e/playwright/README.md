# Eclipse GLSP - Playwright

A Playwright-based framework for testing diagram editors built with the
[Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp).

The package provides page objects for the GLSP diagram model, flows for editor interactions such
as click, drag and rename, and an integration API that runs one test suite against several tool
platforms. The standalone integration is part of this package. Theia and VS Code are added by
[`@eclipse-glsp/playwright-theia`](https://www.npmjs.com/package/@eclipse-glsp/playwright-theia) and
[`@eclipse-glsp/playwright-vscode`](https://www.npmjs.com/package/@eclipse-glsp/playwright-vscode),
which are released from the [`glsp-theia-integration`](https://github.com/eclipse-glsp/glsp-theia-integration/tree/master/e2e/playwright-theia)
and [`glsp-vscode-integration`](https://github.com/eclipse-glsp/glsp-vscode-integration/tree/master/e2e/playwright-vscode) repositories.

## Documentation

[./docs](./docs/readme.md) explains the concepts:
[Integration](./docs/concepts/integration.md), [Extension](./docs/concepts/extension.md),
[Metadata](./docs/concepts/metadata.md), and the
[differences to plain Playwright](./docs/concepts/playwright-differences.md).

[`e2e/workflow-e2e`](../workflow-e2e) is a full example. It tests the Workflow diagram example of
this repository.

## Building

Run `pnpm build` in the repository root.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
