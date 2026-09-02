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
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GLSP_SERVER_TYPE_NODE } from '../src/server/server';

/**
 * Ports of the applications shipped by this workspace. Integration packages in other repositories
 * host their own applications, so they pass their default to {@link getPort} instead of registering
 * it here.
 */
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
 * run and must be idempotent. Which `.env` file to read is deliberately left to the caller — where
 * that file lives is a property of the consuming repository — see {@link loadEnv}.
 */
export function applyEnvDefaults(): void {
    // `@eclipse-glsp/playwright` resolves the server type from `process.env` so that page objects
    // and suites can branch on it. The workspace ships the Node server, so make that the default
    // instead of leaving the framework at its generic `unknown`.
    process.env.GLSP_SERVER_TYPE ??= GLSP_SERVER_TYPE_NODE;
}

/**
 * Loads a `.env` file into `process.env`.
 *
 * Anchored on an explicit directory rather than the working directory: `dotenv.config()` without a
 * path reads `<cwd>/.env`, and the working directory differs depending on whether tests are started
 * from the repository root, from the package, or from an IDE. Playwright also re-reads the
 * configuration in every worker, so this runs more than once per test run and must be deterministic.
 *
 * @param envDir Directory holding the `.env` file
 */
export function loadEnv(envDir: string): void {
    dotenv.config({ path: path.resolve(envDir, '.env'), quiet: true });
}

/**
 * Resolves a port from `process.env`.
 *
 * @param envVar Name of the environment variable holding the port
 * @param defaultPort Fallback for ports this workspace does not know about, i.e. applications hosted
 * by an integration package in another repository
 */
export function getPort(envVar: string, defaultPort?: number): number {
    const val = process.env[envVar];
    if (val) {
        return parseInt(val, 10);
    }
    const fallback = defaultPort ?? DEFAULT_PORTS[envVar];
    if (fallback !== undefined) {
        return fallback;
    }
    throw new Error(`No default port for ${envVar}`);
}

export function getUrl(portEnvVar: string, urlPath: string = '', defaultPort?: number): string {
    return `http://localhost:${getPort(portEnvVar, defaultPort)}${urlPath}`;
}

export function getEnv(parameter: string, log: boolean = true): string | undefined {
    const val = process.env[parameter];

    if (log && (val === undefined || val === null)) {
        console.error(`[Worker: ${process.env.TEST_PARALLEL_INDEX}] Parameter "${parameter}" not found in process.env`);
    }
    return val;
}
