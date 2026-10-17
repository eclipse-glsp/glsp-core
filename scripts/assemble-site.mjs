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

// Collects the two browser examples into `dist-site/`, the directory that the GitHub Pages
// workflows deploy (main deployment and PR previews):
//   examples/playground/app       -> dist-site/           (diagram.html)
//   examples/workflow-server-mcp-demo/dist -> dist-site/mcp-demo/  (index.html)
// The playground example goes to the root so that the published URL stays `<site>/diagram.html`.
// Both examples must be built beforehand; the root `bundle:site` script does that.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `fileURLToPath` rather than `URL.pathname`: the latter yields '/C:/...' on Windows.
const root = fileURLToPath(new URL('..', import.meta.url));
const site = join(root, 'dist-site');

const sources = [
    {
        from: join(root, 'examples/playground/app'),
        to: site,
        // Only the browser-mode client loads the worker. Without this check a node-mode bundle would
        // be deployed, which cannot work on Pages because it expects a WebSocket server.
        requires: 'bundle.js',
        contains: 'playground-server-webworker.js',
        hint: "run 'pnpm bundle:browser'"
    },
    {
        from: join(root, 'examples/workflow-server-mcp-demo/dist'),
        to: join(site, 'mcp-demo'),
        requires: 'index.html',
        hint: "run 'pnpm mcp-demo build'"
    }
];

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

for (const { from, to, requires, contains, hint } of sources) {
    const required = join(from, requires);
    if (!existsSync(required) || (contains && !readFileSync(required, 'utf8').includes(contains))) {
        console.error(`[assemble-site] ${required} is missing or not the expected build, ${hint} first.`);
        process.exit(1);
    }
    cpSync(from, to, { recursive: true });
}

console.log('[assemble-site] dist-site/ populated (diagram.html, mcp-demo/index.html)');
