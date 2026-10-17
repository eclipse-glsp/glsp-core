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

// Populates `dist/` with everything `serve` needs that esbuild doesn't emit:
//  - verbatim files from `public/` (index.html, mcp-service-worker.js)
//  - the playground-server worker bundle and the example1.wf model it fetches, both from
//    `@eclipse-glsp-examples/playground`
// esbuild writes `index.bundle.js` into the same dir as a separate step.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const here = new URL('..', import.meta.url).pathname;
const dist = join(here, 'dist');

mkdirSync(dist, { recursive: true });

// 1. Verbatim assets from ./public/
const publicDir = join(here, 'public');
if (existsSync(publicDir)) {
    for (const entry of readdirSync(publicDir)) {
        const source = join(publicDir, entry);
        if (statSync(source).isFile()) {
            copyFileSync(source, join(dist, entry));
        }
    }
}

// 2. Worker bundle and the model it loads
const playgroundApp = join(dirname(require.resolve('@eclipse-glsp-examples/playground/package.json')), 'app');
const files = ['playground-server-webworker.js', 'playground-server-webworker.js.map', 'example1.wf'].map(file =>
    join(playgroundApp, file)
);
for (const source of files) {
    if (!existsSync(source)) {
        console.error(`[prepare-dist] Missing ${source} — build the playground first.`);
        process.exit(1);
    }
    copyFileSync(source, join(dist, basename(source)));
}

console.log('[prepare-dist] dist/ populated (public assets, worker bundle, example model)');
