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
import { GLSP_SERVER_TYPE_NODE } from '../src/server/server';

const DEFAULT_PORTS: Record<string, number> = {
    GLSP_SERVER_PORT: 8081,
    STANDALONE_PORT: 8082,
    STANDALONE_BROWSER_PORT: 8083
};

/**
 * Applies the defaults for the variables that the page objects and suites read straight from
 * `process.env`. Call this from the `playwright.config.ts` before anything else reads them.
 *
 * Playwright re-evaluates the configuration in every worker, so this runs more than once per test
 * run and must be idempotent. Loading a `.env` file is deliberately left to the caller: where that
 * file lives is a property of the consuming repository, not of the shared suites.
 */
export function applyEnvDefaults(): void {
    // `@eclipse-glsp/playwright` resolves the server type from `process.env` so that page objects
    // and suites can branch on it. The workspace ships the Node server, so make that the default
    // instead of leaving the framework at its generic `unknown`.
    process.env.GLSP_SERVER_TYPE ??= GLSP_SERVER_TYPE_NODE;
}

export function getPort(envVar: string): number {
    const val = process.env[envVar];
    if (val) {
        return parseInt(val, 10);
    }
    const defaultPort = DEFAULT_PORTS[envVar];
    if (defaultPort !== undefined) {
        return defaultPort;
    }
    throw new Error(`No default port for ${envVar}`);
}

export function getUrl(portEnvVar: string, urlPath: string = ''): string {
    return `http://localhost:${getPort(portEnvVar)}${urlPath}`;
}

export function getEnv(parameter: string, log: boolean = true): string | undefined {
    const val = process.env[parameter];

    if (log && (val === undefined || val === null)) {
        console.error(`[Worker: ${process.env.TEST_PARALLEL_INDEX}] Parameter "${parameter}" not found in process.env`);
    }
    return val;
}
