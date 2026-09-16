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

import * as path from 'path';
import {
    LOGGER,
    PackageHelper,
    baseCommand,
    configureExec,
    configureLogger,
    exec,
    execAsync,
    getUncommittedChanges,
    getWorkspacePackages,
    validateGitDirectory
} from '../util';

/** Scopes whose exact-pinned next versions are managed by this command. */
const GLSP_SCOPES = ['@eclipse-glsp/', '@eclipse-glsp-examples/'];

/** An exact prerelease version as produced by the GLSP `next` publishing, e.g. `2.9.0-next.3`. */
const NEXT_VERSION_PATTERN = /^\d+\.\d+\.\d+-next(\.\d+)?$/;

export const UpdateNextCommand = baseCommand()
    .name('updateNext')
    .alias('u')
    .description("Updates all pinned `next` dependencies in a GLSP project to the currently published 'next' versions")
    .argument('[rootDir]', 'The repository root', validateGitDirectory, process.cwd())
    .option('-v, --verbose', 'Enable verbose (debug) log output', false)
    .action(updateNext);

export async function updateNext(rootDir: string, options: { verbose: boolean }): Promise<void> {
    configureLogger(options.verbose);

    rootDir = path.resolve(rootDir);
    const packages = getWorkspacePackages(rootDir, true);
    const manifestPaths = new Set(packages.map(pkg => pkg.filePath));
    if (getUncommittedChanges(rootDir).some(file => manifestPaths.has(file))) {
        LOGGER.warn('Uncommitted changes in workspace `package.json` files. Please commit or stash them before running this command.');
        return;
    }

    configureExec({ silent: false, fatal: true });

    LOGGER.info('Updating next dependencies ...');
    LOGGER.debug(`Scanning ${packages.length} packages for 'next' dependencies`, packages);
    const versions = resolveNextVersions(getNextDependencies(packages));
    if (Object.keys(versions).length === 0) {
        LOGGER.info('No next dependencies found');
        return;
    }

    let updates = 0;
    for (const pkg of packages) {
        let pkgChanged = false;
        for (const deps of dependencySections(pkg)) {
            for (const [dep, range] of Object.entries(deps)) {
                const version = versions[dep];
                if (version && isNextDependency(dep, range) && range !== version) {
                    LOGGER.info(`${pkg.name}: ${dep} ${range} -> ${version}`);
                    deps[dep] = version;
                    pkgChanged = true;
                    updates++;
                }
            }
        }
        if (pkgChanged) {
            pkg.write();
        }
    }
    if (updates === 0) {
        LOGGER.info('All next dependencies are already up to date');
        return;
    }

    LOGGER.info(`Updated ${updates} next dependencies. Installing ...`);
    await execAsync('pnpm install', { silent: false, cwd: rootDir });
    LOGGER.info('Upgrade successfully completed');
}

/** The dependency sections of a package manifest that are scanned for next dependencies. */
function dependencySections(pkg: PackageHelper): Record<string, string>[] {
    return [pkg.content.dependencies, pkg.content.devDependencies, pkg.content.peerDependencies].filter(
        (deps): deps is Record<string, string> => deps !== undefined
    );
}

/**
 * A next dependency is either pinned to an exact next version of a GLSP package, or uses a legacy
 * literal `next` (dist-tag) range — the latter is migrated to an exact pin on the first update.
 * Exact next versions of non-GLSP packages are deliberately left alone: they are not driven by the
 * GLSP `next` dist-tags and must be updated manually.
 */
function isNextDependency(name: string, range: string): boolean {
    if (range === 'next') {
        return true;
    }
    return NEXT_VERSION_PATTERN.test(range) && GLSP_SCOPES.some(scope => name.startsWith(scope));
}

function getNextDependencies(packages: PackageHelper[]): string[] {
    const dependencies: string[] = [];
    for (const pkg of packages) {
        for (const deps of dependencySections(pkg)) {
            dependencies.push(...Object.keys(deps).filter(dep => isNextDependency(dep, deps[dep])));
        }
    }
    const nextDeps = [...new Set(dependencies)];
    LOGGER.debug(`Found ${nextDeps.length} 'next' dependencies`, nextDeps);
    return nextDeps;
}

/**
 * Resolves the current concrete version of the `next` dist-tag for each given dependency
 * (e.g. `@eclipse-glsp/protocol` -> `2.9.0-next.3`).
 */
function resolveNextVersions(dependencies: string[]): Record<string, string> {
    const versions: Record<string, string> = {};
    dependencies.forEach(dep => {
        LOGGER.info(`Retrieving next version for ${dep}`);
        versions[dep] = exec(`npm view ${dep}@next version`, { silent: true }).trim();
    });
    return versions;
}
