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

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

export function git(args: string, cwd: string): string {
    return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function readJson(filePath: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function resetRepo(repoDir: string): void {
    git('checkout .', repoDir);
    git('clean -fd', repoDir);
}

export function currentBranch(repoDir: string): string {
    return git('rev-parse --abbrev-ref HEAD', repoDir);
}

export function isMavenAvailable(): boolean {
    try {
        execSync('mvn --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        return true;
    } catch {
        return false;
    }
}

/**
 * Reads the workspace package globs of a repo. pnpm repos declare them in `pnpm-workspace.yaml`;
 * legacy repos use the `workspaces` field in the root `package.json`.
 */
export function readWorkspaceGlobs(repoDir: string): string[] {
    const pnpmWorkspace = path.join(repoDir, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWorkspace)) {
        const parsed = YAML.parse(fs.readFileSync(pnpmWorkspace, 'utf8')) as { packages?: string[] };
        return parsed?.packages ?? [];
    }
    const rootPkg = readJson(path.join(repoDir, 'package.json'));
    return Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : ((rootPkg.workspaces as { packages?: string[] })?.packages ?? []);
}

/** Expands the `*` segments of a workspace glob into the matching directories. */
function expandGlobDirs(baseDir: string, segments: string[]): string[] {
    if (segments.length === 0) {
        return fs.existsSync(baseDir) ? [baseDir] : [];
    }
    const [segment, ...rest] = segments;
    if (segment !== '*') {
        return expandGlobDirs(path.join(baseDir, segment), rest);
    }
    if (!fs.existsSync(baseDir)) {
        return [];
    }
    return fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .flatMap(entry => expandGlobDirs(path.join(baseDir, entry.name), rest));
}

/**
 * Finds the workspace package.json files (not the root) of a repo by resolving its workspace globs.
 * Nested globs are supported, so grouped layouts like glsp-core's `packages/<group>/<package>` are
 * resolved as well.
 */
export function findWorkspacePackageJsons(repoDir: string): string[] {
    const results: string[] = [];
    for (const pattern of readWorkspaceGlobs(repoDir)) {
        const segments = pattern.replace(/^\.\//, '').split('/').filter(Boolean);
        for (const dir of expandGlobDirs(repoDir, segments)) {
            const pkgPath = path.join(dir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                results.push(pkgPath);
            }
        }
    }
    return results;
}

export function isSshAvailable(): boolean {
    try {
        // ssh -T git@github.com exits 1 on success ("Hi <user>!") and 255 on auth failure
        const result = execSync('ssh -o BatchMode=yes -o StrictHostKeyChecking=no -T git@github.com 2>&1', {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.includes('successfully authenticated');
    } catch (err: any) {
        return typeof err.stdout === 'string' && err.stdout.includes('successfully authenticated');
    }
}
