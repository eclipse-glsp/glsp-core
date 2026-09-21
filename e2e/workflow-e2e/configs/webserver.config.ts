/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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

import type { PlaywrightTestConfig } from '@playwright/test';
import * as path from 'path';
import { GLSP_SERVER_TYPE_JAVA } from '../src/server/server';
import { getPort } from './env';
import type { ProjectName } from './project.config';

export type WebServerConfig = Exclude<NonNullable<PlaywrightTestConfig['webServer']>, readonly unknown[]>;

/**
 * Directory of the `workflow-standalone` example, which provides the diagram client and — unless
 * an external server is used — the Workflow GLSP server.
 *
 * Resolved through the module resolution of the `workflow-standalone` dependency rather than by a
 * relative path, so that the build-order dependency on the example is a real edge in the workspace
 * graph instead of a string this file has to keep in sync with the directory layout. The example is
 * `private`, so the dependency can only be expressed as `workspace:*`.
 */
function getStandaloneDir(): string {
    return path.dirname(require.resolve('workflow-standalone/package.json'));
}

/**
 * Whether the Workflow GLSP server is provided by the caller instead of being started by
 * Playwright. Required for `GLSP_SERVER_TYPE=java`, whose server lives in the separate
 * `glsp-server` repository and has to be running before the tests are started.
 */
function usesExternalServer(): boolean {
    return process.env.GLSP_SERVER_TYPE === GLSP_SERVER_TYPE_JAVA || process.env.GLSP_SERVER_EXTERNAL === 'true';
}

/**
 * The web server for one standalone project.
 *
 * Both projects are served by the `workflow-standalone` example from this workspace. Its `start`
 * script serves the pre-built client and, in Node mode, also launches the Workflow GLSP server, so
 * one entry per project covers everything the tests need. Run `pnpm build` beforehand — `start`
 * serves the built bundles and does not compile.
 *
 * @param project Project the web server is started for
 */
export function buildStandaloneWebServer(project: ProjectName): WebServerConfig {
    const isBrowser = project === 'standalone-browser';
    const clientPort = getPort(isBrowser ? 'STANDALONE_BROWSER_PORT' : 'STANDALONE_PORT');
    const glspServerPort = getPort('GLSP_SERVER_PORT');

    // Browser mode runs the GLSP server as a web worker, so it neither needs nor accepts a server
    // process; `--external-server` is Node-mode only.
    const externalServer = !isBrowser && usesExternalServer() ? ' --external-server' : '';
    const script = isBrowser ? 'start:browser' : 'start';

    return {
        command: `pnpm -C "${getStandaloneDir()}" ${script} --no-open --client-port ${clientPort} --port ${glspServerPort}${externalServer}`,
        url: `http://localhost:${clientPort}/diagram.html`,
        reuseExistingServer: !process.env.CI,
        // stdout is just build/serve progress; stderr stays piped so a missing bundle or a failing
        // server start is visible instead of surfacing as a web-server timeout.
        stdout: 'ignore',
        env: {
            ...(process.env as Record<string, string>),
            CLIENT_PORT: String(clientPort),
            // Baked into the client bundle by the example's esbuild build, which `start` re-runs.
            GLSP_SERVER_PORT: String(glspServerPort)
        }
    };
}

/**
 * The web servers for the active standalone projects.
 *
 * @param activeProjects Projects the run was started for
 */
export function buildWebServers(activeProjects: ProjectName[]): PlaywrightTestConfig['webServer'] {
    return activeProjects.map(project => buildStandaloneWebServer(project));
}
