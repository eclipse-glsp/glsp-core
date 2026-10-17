# Eclipse GLSP - Playground Server

The GLSP server behind the [playground](../playground) example application. It composes all example languages of this repository into one server, so a single client connection can open any of their files.

It provides two entry points:

- `src/node/app.ts`: Node.js server over WebSocket (`-w`) or socket, bundled by `pnpm bundle` into `dist/playground-server-node.js`. Models are read from and written to the file system.
- `src/browser/app.ts`: server running in a Web Worker. Models are fetched by their `sourceUri`, relative to the worker bundle, and cannot be saved. The playground bundles it into its `app/playground-server-webworker.js`, together with the client, so both live-reload together in development.

The package is workspace-private. The published Workflow server is [`@eclipse-glsp-examples/workflow-server`](../workflow-server).
