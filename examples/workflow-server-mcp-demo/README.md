# Workflow Server MCP Demo (browser)

A browser demo for the `@eclipse-glsp/server-mcp` portable Fetch handler. The page opens a
workflow GLSP session inside an in-page Web Worker and drives the MCP server through a
Service Worker that intercepts `fetch('/mcp', ...)` and proxies the request to the Worker via
`MessageChannel`.

This package is private and ships nothing. It is a local demo and manual test bench for the
portable handler.

## Why only a browser demo?

The browser variant needs its own setup because external MCP clients cannot reach an in-page
launcher. A browser tab does not accept inbound network traffic. The Service Worker in this
demo is what makes the in-page launcher reachable for a same-origin MCP client.

The Node variant needs no demo in this repo. Its launcher binds a real HTTP listener and
announces the URL on stdout (`[GLSP-MCP-Server]:Ready. {...}`). Point any MCP
client at that URL:

- The official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the best
  manual debug tool. It runs as a local web UI and lets you exercise tools, prompts and
  resources interactively.
- Claude Code, Cursor, or any other MCP-aware client also work.

The automated end-to-end spec at
`packages/server-mcp/src/node/server/mcp-http-transport-e2e.spec.ts` also covers the Node path.
It runs an MCP SDK `Client` over real HTTP against the launcher.

## Running

Build the workspace once so the web worker bundle exists, then serve the demo:

```bash
pnpm build   # from the repository root; produces the bundled-web worker
pnpm -C examples/workflow-server-mcp-demo start
```

`start` copies the worker bundle from `@eclipse-glsp-examples/workflow-server-bundled-web`,
builds the page-side bundle, and serves the directory on `http://localhost:8000/`.

Open `http://localhost:8000/` in any modern browser and step through the buttons from top to
bottom. The workflow renders once MCP is initialized, and **Create task** mutates the live
session.

## What it exercises

1. The page acts as a minimal GLSP JSON-RPC client over `postMessage` to the in-page Web
   Worker (using `vscode-jsonrpc/browser`, bundled).
2. GLSP `initialize` carries `mcpServer: {}`, so the Worker's per-connection child container
   activates `BrowserMcpServerModule`'s launcher as a `GLSPServerInitializer`.
3. `initializeClientSession` opens a real workflow GLSP session with
   `diagramType: workflow-diagram`.
4. A Service Worker (`mcp-service-worker.js`) intercepts `fetch('/mcp', ...)` and proxies the
   request through a `MessageChannel` to the Worker.
5. MCP tools (`initialize`, `tools/list`, `session-info`, `query-elements`, `diagram-model`,
   `create-nodes`) round-trip end-to-end against the live session.

The on-page SVG is a minimal schematic renderer, not the GLSP client. It exists only to make
the output of the MCP handlers visible end-to-end.

## Hard reset

If a stale Service Worker misbehaves, open DevTools, go to Application, then Service Workers,
and click Unregister. Then close the tab and re-open it. The page's Worker bundle URL is cache-busted per
load, but the SW itself updates only on full lifecycle restart.
