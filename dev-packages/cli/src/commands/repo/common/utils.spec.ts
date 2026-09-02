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

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GLSPRepo } from '../../../util';
import { createTempDir, cleanupTempDir } from '../../../../tests/helpers/test-helper';
import { discoverRepos, getBuildOrder, isLeafRepo, resolveWorkspaceDir } from './utils';

// `resolveWorkspaceDir` inspects every ancestor up to the filesystem root, so directories that
// happen to live next to the temp dir (e.g. GLSP checkouts in the system temp folder) would leak
// into the tests. While `readdirBoundary` is set, everything outside of it reads as empty.
let readdirBoundary: string | undefined;
vi.mock('fs', async importOriginal => {
    const actual = await importOriginal<typeof import('fs')>();
    const readdirSync = ((dir: fs.PathLike, options: never) =>
        readdirBoundary && !path.resolve(String(dir)).startsWith(readdirBoundary)
            ? []
            : actual.readdirSync(dir, options)) as typeof actual.readdirSync;
    return { ...actual, readdirSync };
});

// ── workspace-resolution ──────────────────────────────────────────────────

describe('workspace-resolution', () => {
    let tempDir: string;
    let originalCwd: string;

    beforeEach(() => {
        tempDir = createTempDir();
        originalCwd = process.cwd();
    });

    afterEach(() => {
        process.chdir(originalCwd);
        cleanupTempDir(tempDir);
    });

    describe('resolveWorkspaceDir', () => {
        it('should return the given directory when cliDir is provided', () => {
            const dir = path.join(tempDir, 'my-workspace');
            fs.mkdirSync(dir, { recursive: true });
            const result = resolveWorkspaceDir(dir);
            expect(result).toBe(dir);
        });

        it('should resolve a relative cliDir against cwd', () => {
            process.chdir(tempDir);
            fs.mkdirSync(path.join(tempDir, 'sub'), { recursive: true });
            const result = resolveWorkspaceDir('sub');
            expect(result).toBe(path.resolve(tempDir, 'sub'));
        });

        it('should return cwd when no cliDir and not inside a known repo', () => {
            readdirBoundary = tempDir;
            process.chdir(tempDir);
            const result = resolveWorkspaceDir();
            readdirBoundary = undefined;
            expect(result).toBe(tempDir);
        });

        it('should return the parent of a known repo root when inside one', () => {
            const repoDir = path.join(tempDir, 'glsp-core');
            fs.mkdirSync(repoDir, { recursive: true });
            process.chdir(repoDir);
            const result = resolveWorkspaceDir();
            expect(result).toBe(tempDir);
        });

        it('should walk up from a nested directory inside a known repo', () => {
            const repoDir = path.join(tempDir, 'glsp-core');
            const nestedDir = path.join(repoDir, 'packages', 'client', 'client', 'src');
            fs.mkdirSync(nestedDir, { recursive: true });
            process.chdir(nestedDir);
            const result = resolveWorkspaceDir();
            expect(result).toBe(tempDir);
        });
    });
});

// ── repo-discovery ────────────────────────────────────────────────────────

describe('repo-discovery', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        cleanupTempDir(tempDir);
    });

    describe('discoverRepos', () => {
        it('should find known GLSP repo directories', () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-core'));
            fs.mkdirSync(path.join(tempDir, 'glsp-theia-integration'));
            const repos = discoverRepos(tempDir);
            expect(repos).toEqual(['glsp-core', 'glsp-theia-integration']);
        });

        it('should ignore non-GLSP directories', () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-core'));
            fs.mkdirSync(path.join(tempDir, 'my-project'));
            fs.mkdirSync(path.join(tempDir, 'node_modules'));
            const repos = discoverRepos(tempDir);
            expect(repos).toEqual(['glsp-core']);
        });

        it('should ignore files matching GLSP repo names', () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-core'));
            fs.writeFileSync(path.join(tempDir, 'glsp-theia-integration'), 'not a dir');
            const repos = discoverRepos(tempDir);
            expect(repos).toEqual(['glsp-core']);
        });

        it('should return empty array for nonexistent directory', () => {
            const repos = discoverRepos(path.join(tempDir, 'nonexistent'));
            expect(repos).toEqual([]);
        });

        it('should return repos sorted by GLSPRepo.choices order', () => {
            fs.mkdirSync(path.join(tempDir, 'glsp-playwright'));
            fs.mkdirSync(path.join(tempDir, 'glsp-theia-integration'));
            fs.mkdirSync(path.join(tempDir, 'glsp-core'));
            const repos = discoverRepos(tempDir);
            expect(repos).toEqual(['glsp-core', 'glsp-theia-integration', 'glsp-playwright']);
        });

        it('should return empty array when no GLSP repos exist', () => {
            fs.mkdirSync(path.join(tempDir, 'some-project'));
            const repos = discoverRepos(tempDir);
            expect(repos).toEqual([]);
        });
    });
});

// ── repo-graph ──────────────────────────────────────────────────────────────

describe('repo-graph', () => {
    describe('getBuildOrder', () => {
        it('should return repos in dependency order', () => {
            const repos: GLSPRepo[] = ['glsp-theia-integration', 'glsp-core'];
            const order = getBuildOrder(repos);
            const coreIdx = order.indexOf('glsp-core');
            const theiaIdx = order.indexOf('glsp-theia-integration');
            expect(coreIdx).toBeLessThan(theiaIdx);
        });

        it('should include only requested repos', () => {
            const repos: GLSPRepo[] = ['glsp-core', 'glsp-vscode-integration'];
            const order = getBuildOrder(repos);
            expect(order).toHaveLength(2);
            expect(order).toContain('glsp-core');
            expect(order).toContain('glsp-vscode-integration');
        });

        it('should not pull in dependencies that were not requested', () => {
            const repos: GLSPRepo[] = ['glsp-theia-integration'];
            const order = getBuildOrder(repos);
            expect(order).toEqual(['glsp-theia-integration']);
        });

        it('should handle independent repos', () => {
            const repos: GLSPRepo[] = ['glsp-playwright'];
            const order = getBuildOrder(repos);
            expect(order).toEqual(['glsp-playwright']);
        });

        it('should place glsp-server before glsp-eclipse-integration', () => {
            const repos: GLSPRepo[] = ['glsp-eclipse-integration', 'glsp-server', 'glsp-core'];
            const order = getBuildOrder(repos);
            const serverIdx = order.indexOf('glsp-server');
            const eclipseIdx = order.indexOf('glsp-eclipse-integration');
            expect(serverIdx).toBeLessThan(eclipseIdx);
        });

        it('should place glsp-core before glsp-eclipse-integration', () => {
            const repos: GLSPRepo[] = ['glsp-eclipse-integration', 'glsp-server', 'glsp-core'];
            const order = getBuildOrder(repos);
            expect(order.indexOf('glsp-core')).toBeLessThan(order.indexOf('glsp-eclipse-integration'));
        });
    });

    describe('isLeafRepo', () => {
        it('should return true for repos that no other repo depends on', () => {
            expect(isLeafRepo('glsp-theia-integration')).toBe(true);
            expect(isLeafRepo('glsp-vscode-integration')).toBe(true);
            expect(isLeafRepo('glsp-eclipse-integration')).toBe(true);
            expect(isLeafRepo('glsp-playwright')).toBe(true);
        });

        it('should return false for repos that are dependencies of other repos', () => {
            expect(isLeafRepo('glsp-core')).toBe(false);
            expect(isLeafRepo('glsp-server')).toBe(false);
        });
    });
});
