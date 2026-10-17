/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
// @ts-check
const { spawn } = require('child_process');
const esbuild = require('esbuild');
const path = require('path');

const appRoot = path.resolve(__dirname, 'app');
// The web-worker GLSP server is built only here, straight from the playground-server sources: esbuild
// compiles its `src/browser/app.ts` into the app alongside the client. It is emitted in both modes, so
// every build provides it to its other consumers (the MCP demo and the CLI's `browser-bundle`).
const workerEntry = path.resolve(__dirname, '..', 'playground-server', 'src', 'browser', 'app.ts');

const args = process.argv.slice(2);
const isBrowser = args.includes('--browser');
const isWatch = args.includes('--watch'); // dev: rebuild + live-reload
const isServe = args.includes('--serve'); // start: serve the built bundle, no watch/live-reload
const isMcp = args.includes('--mcp');
const noOpen = args.includes('--no-open');

// full-page live reload: subscribe to esbuild's change stream (served on the dev port). Over file://
// there is no EventSource endpoint, so the guard turns this into a harmless no-op for production builds.
// The same banner is prepended to the web-worker bundle; gate on `window` (absent in a Worker) so the
// worker no-ops instead of calling the non-existent `WorkerLocation.reload`.
//
// Reload only when a non-sourcemap output changed: esbuild watches the original .ts(x) sources (it
// reads them to fill the output map's `sourcesContent`), so an editor save rebuilds once *before*
// the dev tsc has recompiled `lib/`. That early rebuild only updates the `.map`; the real reload
// follows when tsc's fresh `lib/` changes the bundle itself.
const liveReloadBanner = {
    js:
        ";(() => { if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {" +
        " new EventSource('/esbuild').addEventListener('change', e => {" +
        ' const { added, removed, updated } = JSON.parse(e.data);' +
        " if ([...added, ...removed, ...updated].some(p => !p.endsWith('.map'))) { location.reload(); }" +
        ' }); } })();'
};

/**
 * Reports the build progress and surfaces errors/warnings in a format that
 * VS Code's `$esbuild-watch` problem matcher can pick up.
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        build.onStart(() => {
            console.log(`${isWatch ? '[watch] ' : ''}build started`);
        });
        build.onEnd(result => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                if (location) {
                    console.error(`    ${location.file}:${location.line}:${location.column}:`);
                }
            });
            console.log(`${isWatch ? '[watch] ' : ''}build finished`);
        });
    }
};

// mirror webpack's DefinePlugin; only injected for the node/websocket entry
const nodeDefine = {
    GLSP_SERVER_HOST: JSON.stringify(process.env.GLSP_SERVER_HOST || 'localhost'),
    GLSP_SERVER_PORT: JSON.stringify(process.env.GLSP_SERVER_PORT || '8081'),
    GLSP_MCP_SERVER_PORT: JSON.stringify(process.env.GLSP_MCP_SERVER_PORT || '64577'),
    GLSP_APP_ROOT: JSON.stringify(appRoot)
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    // One build emits two outputs: the client (`bundle.js`) and the GLSP server compiled from
    // playground-server's sources into the worker (`playground-server-webworker.js`). A single build
    // context means a change to either side triggers one rebuild + one live-reload in dev.
    entryPoints: [
        { in: path.resolve(__dirname, isBrowser ? 'src/browser/app.ts' : 'src/node/app.ts'), out: 'bundle' },
        { in: workerEntry, out: 'playground-server-webworker' }
    ],
    outdir: appRoot,
    entryNames: '[name]', // -> app/bundle.js (+ app/bundle.css), app/playground-server-webworker.js
    assetNames: '[name]-[hash]', // -> app/codicon-<hash>.ttf, referenced relatively from bundle.css
    bundle: true,
    sourcemap: true,
    format: 'iife', // diagram.html loads bundle.js via a classic <script src>
    platform: 'browser',
    target: ['es2019'],
    logLevel: 'silent',
    loader: { '.ttf': 'file' },
    // no publicPath -> relative asset URLs, required for file:// (e2e) and gh-pages subfolders
    define: isBrowser ? {} : nodeDefine,
    external: ['fs', 'net'], // node builtins potentially pulled in by ws; browser platform shims the rest
    plugins: [esbuildProblemMatcherPlugin]
};

function openBrowser(url) {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(command, [url], { shell: process.platform === 'win32', stdio: 'ignore', detached: true }).unref();
}

async function build() {
    await esbuild.build(buildOptions);
}

// serve the app on the dev port; with `watch` it also rebuilds on change and injects the live-reload banner
async function serve({ watch }) {
    // `ctx.watch()` starts its initial build asynchronously and resolves before that build finishes,
    // so `ctx.rebuild()` does NOT guarantee no build is in flight. If we serve + open the browser
    // right away, a warm (already-open) browser connects mid-build and esbuild fires a live-reload the
    // instant the build finishes - the startup flicker. Gate the dev port on a *settled* build: expose
    // it only once builds have been quiet briefly, so the browser always connects to a finished build.
    let markSettled = () => {};
    const settled = new Promise(resolve => (markSettled = resolve));
    let settleTimer;
    const buildSettleGate = {
        name: 'build-settle-gate',
        setup(build) {
            build.onEnd(() => {
                clearTimeout(settleTimer);
                settleTimer = setTimeout(markSettled, 150);
            });
        }
    };
    const ctx = await esbuild.context(
        watch ? { ...buildOptions, banner: liveReloadBanner, plugins: [...buildOptions.plugins, buildSettleGate] } : buildOptions
    );
    if (watch) {
        await ctx.watch();
        await settled; // wait for the initial build (and any immediate follow-ups) to fully finish
    } else {
        await ctx.rebuild();
    }
    const port = parseInt(process.env.CLIENT_PORT || (isBrowser ? '8083' : '8082'), 10);
    // servedir === outdir: freshly built output is overlaid on the static files in app/ (diagram.html, example1.wf)
    const { port: servePort } = await ctx.serve({ servedir: appRoot, port });
    const url = `http://localhost:${servePort}/diagram.html${isMcp ? '?mcp' : ''}`;
    console.log(`Serving playground at ${url}`);
    if (!noOpen) {
        openBrowser(url);
    }
}

const run = isWatch ? serve({ watch: true }) : isServe ? serve({ watch: false }) : build();
run.catch(error => {
    console.error(error);
    process.exit(1);
});
