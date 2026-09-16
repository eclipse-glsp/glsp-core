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

import { describe, it, beforeEach, afterEach, expect, vi, type Mock } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupTempDir, createTempDir } from '../../tests/helpers/test-helper';
import { PackageData, PackageHelper } from '../util';
import * as gitUtil from '../util/git-util';
import * as packageUtil from '../util/package-util';
import * as processUtil from '../util/process-util';
import { updateNext } from './update-next';

describe('updateNext', () => {
    let tempDir: string;
    let execStub: Mock;
    let execAsyncStub: Mock;

    beforeEach(() => {
        tempDir = createTempDir();
        // no uncommitted changes -> the command does not early-return
        vi.spyOn(gitUtil, 'getUncommittedChanges').mockReturnValue([]);
        execStub = vi.spyOn(processUtil, 'exec') as unknown as Mock;
        execAsyncStub = vi.spyOn(processUtil, 'execAsync').mockResolvedValue('') as unknown as Mock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanupTempDir(tempDir);
    });

    function createPackage(relativePath: string, content: Partial<PackageData> & { name: string }): PackageHelper {
        const pkgDir = path.join(tempDir, relativePath);
        fs.mkdirSync(pkgDir, { recursive: true });
        const filePath = path.join(pkgDir, 'package.json');
        fs.writeFileSync(filePath, JSON.stringify({ version: '1.0.0', ...content }, undefined, 4));
        return new PackageHelper(filePath, content.name);
    }

    function readManifest(pkg: PackageHelper): PackageData {
        return JSON.parse(fs.readFileSync(pkg.filePath, 'utf8'));
    }

    /** Stubs `npm view <dep>@next version` lookups with the given versions by dependency name. */
    function stubNextVersions(versions: Record<string, string>): void {
        execStub.mockImplementation((...args: any[]) => {
            const match = (args[0] as string).match(/npm view (\S+)@next version/);
            if (match) {
                const version = versions[match[1]];
                if (!version) {
                    throw new Error('404');
                }
                return version;
            }
            return undefined;
        });
    }

    it('should update exact next pins of GLSP dependencies in the manifests and install', async () => {
        const pkgA = createPackage('packages/a', {
            name: '@example/a',
            dependencies: { '@eclipse-glsp/protocol': '2.9.0-next.2', 'unrelated-dep': '^1.0.0' },
            devDependencies: { '@eclipse-glsp/cli': '2.9.0-next.2' }
        });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
        stubNextVersions({ '@eclipse-glsp/protocol': '2.9.0-next.3', '@eclipse-glsp/cli': '2.9.0-next.3' });

        await updateNext(tempDir, { verbose: false });

        const written = readManifest(pkgA);
        expect(written.dependencies!['@eclipse-glsp/protocol']).toBe('2.9.0-next.3');
        expect(written.devDependencies!['@eclipse-glsp/cli']).toBe('2.9.0-next.3');
        expect(written.dependencies!['unrelated-dep']).toBe('^1.0.0');
        const commands = execAsyncStub.mock.calls.map(call => call[0] as string);
        // uses `pnpm install` (lockfile-respecting), never `pnpm update` (opportunistic in-range bumps)
        expect(commands).toEqual(['pnpm install']);
    });

    it('should migrate legacy literal `next` ranges to exact pins', async () => {
        const pkgA = createPackage('packages/a', {
            name: '@example/a',
            dependencies: { '@eclipse-glsp/client': 'next', 'other-tool': 'next' }
        });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
        stubNextVersions({ '@eclipse-glsp/client': '2.9.0-next.3', 'other-tool': '1.5.0-next.7' });

        await updateNext(tempDir, { verbose: false });

        const written = readManifest(pkgA);
        expect(written.dependencies!['@eclipse-glsp/client']).toBe('2.9.0-next.3');
        // literal `next` ranges are migrated regardless of scope (matching the previous behavior)
        expect(written.dependencies!['other-tool']).toBe('1.5.0-next.7');
    });

    it('should leave exact next versions of non-GLSP packages alone', async () => {
        const pkgA = createPackage('packages/a', {
            name: '@example/a',
            dependencies: { '@eclipse-glsp/protocol': '2.9.0-next.2', 'some-lib': '1.0.0-next.5' }
        });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
        stubNextVersions({ '@eclipse-glsp/protocol': '2.9.0-next.3' });

        await updateNext(tempDir, { verbose: false });

        const written = readManifest(pkgA);
        expect(written.dependencies!['@eclipse-glsp/protocol']).toBe('2.9.0-next.3');
        expect(written.dependencies!['some-lib']).toBe('1.0.0-next.5');
        // no dist-tag lookup is performed for the unmanaged dependency
        const lookups = execStub.mock.calls.map(call => call[0] as string).filter(cmd => /npm view/.test(cmd));
        expect(lookups).toHaveLength(1);
    });

    it('should not install when all next dependencies are already up to date', async () => {
        const pkgA = createPackage('packages/a', {
            name: '@example/a',
            dependencies: { '@eclipse-glsp/protocol': '2.9.0-next.3' }
        });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
        stubNextVersions({ '@eclipse-glsp/protocol': '2.9.0-next.3' });

        await updateNext(tempDir, { verbose: false });

        expect(readManifest(pkgA).dependencies!['@eclipse-glsp/protocol']).toBe('2.9.0-next.3');
        expect(execAsyncStub).not.toHaveBeenCalled();
    });

    it('should do nothing when the repo has no next dependencies', async () => {
        const pkgA = createPackage('packages/a', { name: '@example/a', dependencies: { '@eclipse-glsp/protocol': '^2.0.0' } });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);

        await updateNext(tempDir, { verbose: false });

        expect(execAsyncStub).not.toHaveBeenCalled();
    });

    it('should abort when a workspace manifest has uncommitted changes', async () => {
        const pkgA = createPackage('packages/a', {
            name: '@example/a',
            dependencies: { '@eclipse-glsp/protocol': '2.9.0-next.2' }
        });
        vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
        vi.spyOn(gitUtil, 'getUncommittedChanges').mockReturnValue([pkgA.filePath]);
        stubNextVersions({ '@eclipse-glsp/protocol': '2.9.0-next.3' });

        await updateNext(tempDir, { verbose: false });

        expect(readManifest(pkgA).dependencies!['@eclipse-glsp/protocol']).toBe('2.9.0-next.2');
        expect(execAsyncStub).not.toHaveBeenCalled();
    });
});
