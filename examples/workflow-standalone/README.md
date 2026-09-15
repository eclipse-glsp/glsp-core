# Workflow Standalone Example

Standalone browser application for the GLSP Workflow example diagram.
The package supports two modes. Node mode connects to an external GLSP server over WebSocket, written in Node.js or Java. Browser mode runs the GLSP server in the browser as a Web Worker.

## Prerequisites

Build the GLSP client packages from the repository root:

```bash
pnpm build
```

## Node mode (WebSocket)

In this mode the client connects to a GLSP server over a WebSocket. By default `pnpm start` builds and starts the Node.js workflow server from this workspace (`@eclipse-glsp-examples/workflow-server`), but this mode also works with a [Java-based GLSP server](https://github.com/eclipse-glsp/glsp-server#workflow-diagram-example).

```bash
pnpm start
```

This starts the GLSP server (building its bundle on first run if needed) and launches the esbuild dev server on port 8082.
The application opens at `http://localhost:8082/diagram.html`.

To use your own GLSP server (e.g. the Java server launched from your IDE), start the client without any built-in server:

```bash
pnpm start --external-server
```

You can also configure the server port and host:

```bash
pnpm start --port 9090 --host 0.0.0.0
```

## Browser mode (Web Worker)

In this mode esbuild compiles the GLSP server into a Web Worker straight from the `workflow-server` sources, and it runs directly in the browser. No external server process is needed.

```bash
pnpm start:browser
```

This builds the client and the Web Worker server bundle and launches the esbuild dev server on port 8083.
The application opens at `http://localhost:8083/diagram.html`.

## Development (watch mode)

For active development, the `dev` scripts watch the sources and serve the app with live reload:

```bash
# Node mode: watch client and server sources, (re)start the GLSP server, serve the client
pnpm dev

# Browser mode: watch client and Web Worker server sources, serve the client
pnpm dev:browser
```

The watchers pick up both client and server changes. In Node mode the server restarts and the client reconnects over the WebSocket. In browser mode esbuild rebuilds the client and the worker, and the page reloads.

This also covers edits in the workspace packages the app bundles, such as `@eclipse-glsp/client` and `@eclipse-glsp/server`. The `dev` scripts run an incremental `tsc -b --watch` over the whole workspace alongside esbuild, so editing any package's `src/` recompiles its `lib/`, which the esbuild watchers then bundle and live-reload. esbuild resolves these packages from their compiled `lib/`, matching the production build.

## Building

```bash
# Node bundle (default)
pnpm build

# Browser bundle
pnpm build:browser
```

Both produce a `bundle.js` in the `app/` directory. The browser build also compiles the Web Worker server bundle (`wf-glsp-server-webworker.js`) into the app directory from the `workflow-server` sources.

## Additional options

All `start` and `dev` scripts support the following flags:

- `--external-server`: Node/WebSocket mode only. Skip starting the built-in workflow server. You run the GLSP server yourself, for example the Java workflow server or a Node server launched from an IDE, and the client connects to it over WebSocket.
- `--no-open`: Don't open the browser automatically
- `--port <port>`: Set the GLSP server port (Node mode only, default: 8081)
- `--host <host>`: Set the GLSP server host (Node mode only, default: localhost)
- `--client-port <port>`: Set the esbuild dev server port (default: 8082 in Node mode, 8083 in browser mode)

## URL parameters

The running application reads the following query parameters from the diagram URL. They are independent and can be combined, e.g.:

```
http://localhost:8082/diagram.html?grid&theme=ember&mode=dark
```

| Parameter  | Values                                           | Default       | Description                                                                                    |
| ---------- | ------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| `readonly` | _flag_ (presence only)                           | editable      | Open the diagram in read-only mode (editing disabled).                                         |
| `grid`     | _flag_ (presence only)                           | off           | Show the background grid.                                                                      |
| `theme`    | `tide`, `graphite`, `ember`, `orchid`, `verdant` | `tide`        | Set the color theme. Persisted in local storage, so it also updates the in-app theme switcher. |
| `mode`     | `light`, `dark`                                  | OS preference | Set light or dark appearance. Persisted in local storage.                                      |
| `mcp`      | _flag_ (presence only)                           | off           | Enable the MCP server integration (Node mode only). Also available via the `*:mcp` scripts.    |

Flag parameters only need to be present (their value is ignored), e.g. `?grid` or `?readonly`.
Invalid `theme`/`mode` values are ignored and fall back to the stored value or, for `mode`, the OS preference.
