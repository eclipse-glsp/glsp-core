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

import { describe, it, beforeEach, afterEach, expect, vi, type MockInstance } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupTempDir, createTempDir } from '../../../tests/helpers/test-helper';
import { LOGGER, PackageData, PackageHelper } from '../../util';
import * as packageUtil from '../../util/package-util';
import * as processUtil from '../../util/process-util';
import { deriveCanaryVersion } from './common';
import { PublishCmdOptions, publish } from './publish';

describe('releng publish', () => {
    let tempDir: string;
    let execStub: MockInstance;
    let execAsyncStub: MockInstance;

    beforeEach(() => {
        tempDir = createTempDir();
        execStub = vi.spyOn(processUtil, 'exec');
        execAsyncStub = vi.spyOn(processUtil, 'execAsync').mockResolvedValue('');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanupTempDir(tempDir);
    });

    function createRootPackage(version: string): void {
        fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'parent', version, private: true }));
    }

    function createPackage(relativePath: string, content: Partial<PackageData> & { name: string; version: string }): PackageHelper {
        const pkgDir = path.join(tempDir, relativePath);
        fs.mkdirSync(pkgDir, { recursive: true });
        const filePath = path.join(pkgDir, 'package.json');
        fs.writeFileSync(filePath, JSON.stringify(content, undefined, 4));
        return new PackageHelper(filePath, content.name);
    }

    interface GitStubOptions {
        /** Whether the publish baseline resolves to an ancestor of HEAD (default: no usable baseline) */
        baselineAncestor?: boolean;
        /** Repo-relative files reported as changed since the baseline */
        changedFiles?: string[];
        /** Version returned for `npm view <pkg> dist-tags.next` calls (default: not published) */
        distTagVersion?: string;
    }

    function stubGit(lastTag: string | undefined, commitCount: string, options: GitStubOptions = {}): void {
        execStub.mockImplementation((cmd: string) => {
            if (/git rev-parse --is-shallow-repository/.test(cmd)) {
                return 'false';
            }
            if (/git describe/.test(cmd)) {
                if (!lastTag) {
                    throw new Error('fatal: No names found');
                }
                return lastTag;
            }
            if (/git rev-list/.test(cmd)) {
                return commitCount;
            }
            if (/git merge-base --is-ancestor/.test(cmd)) {
                if (!options.baselineAncestor) {
                    throw new Error('fatal: Not a valid object name');
                }
                return '';
            }
            if (/git diff --name-only/.test(cmd)) {
                return (options.changedFiles ?? []).join('\n');
            }
            if (/npm view/.test(cmd)) {
                if (!options.distTagVersion) {
                    throw new Error('404');
                }
                return options.distTagVersion;
            }
            return undefined;
        });
    }

    function makeOptions(overrides: Partial<PublishCmdOptions> = {}): PublishCmdOptions {
        return { verbose: false, repoDir: tempDir, dryRun: false, ...overrides };
    }

    describe('deriveCanaryVersion', () => {
        it('should derive the canary version from the base version and commit count', () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '42');
            const canary = deriveCanaryVersion(tempDir);
            expect(canary).toEqual({ base: '2.8.0-next', lastTag: 'v2.7.0', commitCount: 42, version: '2.8.0-next.42' });
        });

        it('should only consider release tags so that marker tags do not corrupt the commit count', () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '42');
            deriveCanaryVersion(tempDir);
            const describeCmd = execStub.mock.calls.map(call => call[0] as string).find(cmd => /git describe/.test(cmd));
            expect(describeCmd).toContain("--match 'v[0-9]*'");
        });

        it('should fall back to counting all commits from the root commit when no release tag exists', () => {
            createRootPackage('2.8.0-next');
            stubGit(undefined, '17');
            const canary = deriveCanaryVersion(tempDir);
            expect(canary).toEqual({ base: '2.8.0-next', lastTag: undefined, commitCount: 17, version: '2.8.0-next.17' });
            const revListCmd = execStub.mock.calls.map(call => call[0] as string).find(cmd => /git rev-list/.test(cmd));
            expect(revListCmd).toContain('--count HEAD');
        });

        it('should throw a helpful error in a shallow clone', () => {
            createRootPackage('2.8.0-next');
            execStub.mockImplementation((cmd: string) => (/is-shallow-repository/.test(cmd) ? 'true' : undefined));
            expect(() => deriveCanaryVersion(tempDir)).toThrow(/fetch-depth: 0/);
        });
    });

    describe('publish next', () => {
        it('should apply the canary version to all workspace packages and publish with --tag next', async () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '42');
            const pkgA = createPackage('packages/a', { name: '@eclipse-glsp/a', version: '2.8.0-next' });
            const pkgB = createPackage('packages/b', { name: '@eclipse-glsp/b', version: '2.8.0-next' });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA, pkgB]);

            await publish('next', makeOptions());

            const writtenA = JSON.parse(fs.readFileSync(pkgA.filePath, 'utf8'));
            const writtenB = JSON.parse(fs.readFileSync(pkgB.filePath, 'utf8'));
            expect(writtenA.version).toBe('2.8.0-next.42');
            expect(writtenB.version).toBe('2.8.0-next.42');
            // the root package keeps the plain base version
            const root = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
            expect(root.version).toBe('2.8.0-next');

            expect(execAsyncStub).toHaveBeenCalledOnce();
            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag next --no-git-checks --report-summary');
            expect(execAsyncStub.mock.calls[0][1].cwd).toBe(tempDir);
        });

        it('should not write versions and pass --dry-run in dry-run mode', async () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '7');
            const pkgA = createPackage('packages/a', { name: '@eclipse-glsp/a', version: '2.8.0-next' });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);

            await publish('next', makeOptions({ dryRun: true }));

            const writtenA = JSON.parse(fs.readFileSync(pkgA.filePath, 'utf8'));
            expect(writtenA.version).toBe('2.8.0-next');
            expect(execAsyncStub.mock.calls[0][0]).toContain('--dry-run');
        });

        it('should pass a custom registry to pnpm publish', async () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '7');
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([]);

            await publish('next', makeOptions({ registry: 'http://localhost:4873' }));

            expect(execAsyncStub.mock.calls[0][0]).toContain('--registry http://localhost:4873');
        });

        it('should bump versions and print the publish command without publishing in interactive mode', async () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '42');
            const pkgA = createPackage('packages/a', { name: '@eclipse-glsp/a', version: '2.8.0-next' });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
            const infoStub = vi.spyOn(LOGGER, 'info');

            await publish('next', makeOptions({ interactive: true }));

            // versions are still bumped on disk
            expect(JSON.parse(fs.readFileSync(pkgA.filePath, 'utf8')).version).toBe('2.8.0-next.42');
            // but nothing is published
            expect(execAsyncStub).not.toHaveBeenCalled();
            expect(infoStub.mock.calls.flat()).toContain('\n  pnpm publish -r --tag next --no-git-checks\n');
        });

        it('should refuse to publish a canary if the root version is not a next version', async () => {
            createRootPackage('2.8.0');
            stubGit('v2.7.0', '7');
            try {
                await publish('next', makeOptions());
                expect.fail('should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('not a next version');
            }
        });
    });

    describe('publish next (affected-only)', () => {
        interface TestWorkspace {
            protocol: PackageHelper;
            sprotty: PackageHelper;
            client: PackageHelper;
            server: PackageHelper;
            workflowGlsp: PackageHelper;
            standalone: PackageHelper;
            all: PackageHelper[];
        }

        // a miniature version of the real workspace dependency graph:
        // protocol <- sprotty <- client <- workflow-glsp <- workflow-standalone (private); protocol <- server
        function createWorkspace(): TestWorkspace {
            createRootPackage('2.8.0-next');
            const protocol = createPackage('packages/common/protocol', { name: '@eclipse-glsp/protocol', version: '2.8.0-next' });
            const sprotty = createPackage('packages/client/glsp-sprotty', {
                name: '@eclipse-glsp/sprotty',
                version: '2.8.0-next',
                dependencies: { '@eclipse-glsp/protocol': 'workspace:*' }
            });
            const client = createPackage('packages/client/client', {
                name: '@eclipse-glsp/client',
                version: '2.8.0-next',
                dependencies: { '@eclipse-glsp/sprotty': 'workspace:*', snabbdom: '~3.5.1' }
            });
            const server = createPackage('packages/server/server', {
                name: '@eclipse-glsp/server',
                version: '2.8.0-next',
                dependencies: { '@eclipse-glsp/protocol': 'workspace:*' }
            });
            const workflowGlsp = createPackage('examples/workflow-glsp', {
                name: '@eclipse-glsp-examples/workflow-glsp',
                version: '2.8.0-next',
                dependencies: { '@eclipse-glsp/client': 'workspace:*' }
            });
            const standalone = createPackage('examples/workflow-standalone', {
                name: 'workflow-standalone',
                version: '2.8.0-next',
                private: true,
                dependencies: { '@eclipse-glsp-examples/workflow-glsp': 'workspace:*' }
            });
            const all = [protocol, sprotty, client, server, workflowGlsp, standalone];
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue(all);
            return { protocol, sprotty, client, server, workflowGlsp, standalone, all };
        }

        function readVersion(pkg: PackageHelper): string {
            return JSON.parse(fs.readFileSync(pkg.filePath, 'utf8')).version;
        }

        it('should publish only the changed package and its transitive dependents on a client-only change', async () => {
            const { protocol, sprotty, client, server, workflowGlsp, standalone } = createWorkspace();
            stubGit('v2.7.0', '42', {
                baselineAncestor: true,
                changedFiles: ['packages/client/client/src/change.ts'],
                distTagVersion: '2.8.0-next.30'
            });

            await publish('next', makeOptions());

            // by default the changes of the last commit are evaluated
            expect(execStub.mock.calls.map(call => call[0] as string)).toContain('git diff --name-only HEAD^..HEAD');
            // changed package + dependents get the canary version (private dependents too, they are never published)
            expect(readVersion(client)).toBe('2.8.0-next.42');
            expect(readVersion(workflowGlsp)).toBe('2.8.0-next.42');
            expect(readVersion(standalone)).toBe('2.8.0-next.42');
            // unaffected packages are pinned to their published next version so exact workspace: pins resolve on npm
            expect(readVersion(sprotty)).toBe('2.8.0-next.30');
            expect(readVersion(protocol)).toBe('2.8.0-next.30');
            expect(readVersion(server)).toBe('2.8.0-next.30');
            const cmd = execAsyncStub.mock.calls[0][0] as string;
            expect(cmd).toContain('--filter @eclipse-glsp/client');
            expect(cmd).toContain('--filter @eclipse-glsp-examples/workflow-glsp');
            // dependencies of the changed package are NOT republished, and private packages are never published
            expect(cmd).not.toContain('@eclipse-glsp/sprotty');
            expect(cmd).not.toContain('@eclipse-glsp/protocol');
            expect(cmd).not.toContain('@eclipse-glsp/server');
            expect(cmd).not.toContain('workflow-standalone');
        });

        it('should publish all transitive dependents on a protocol change', async () => {
            createWorkspace();
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['packages/common/protocol/src/change.ts'] });

            await publish('next', makeOptions());

            const cmd = execAsyncStub.mock.calls[0][0] as string;
            expect(cmd).toContain('--filter @eclipse-glsp/protocol');
            expect(cmd).toContain('--filter @eclipse-glsp/sprotty');
            expect(cmd).toContain('--filter @eclipse-glsp/client');
            expect(cmd).toContain('--filter @eclipse-glsp/server');
            expect(cmd).toContain('--filter @eclipse-glsp-examples/workflow-glsp');
            expect(cmd).not.toContain('workflow-standalone');
        });

        it('should not republish the client on an example-only change', async () => {
            const { client } = createWorkspace();
            stubGit('v2.7.0', '42', {
                baselineAncestor: true,
                changedFiles: ['examples/workflow-glsp/src/change.ts'],
                distTagVersion: '2.8.0-next.30'
            });

            await publish('next', makeOptions());

            const cmd = execAsyncStub.mock.calls[0][0] as string;
            expect(cmd).toContain('--filter @eclipse-glsp-examples/workflow-glsp');
            expect(cmd).not.toContain('@eclipse-glsp/client');
            expect(readVersion(client)).toBe('2.8.0-next.30');
        });

        it('should publish nothing when only private packages changed', async () => {
            const { workflowGlsp } = createWorkspace();
            stubGit('v2.7.0', '42', {
                baselineAncestor: true,
                changedFiles: ['examples/workflow-standalone/src/change.ts'],
                distTagVersion: '2.8.0-next.30'
            });

            await publish('next', makeOptions());

            expect(execAsyncStub).not.toHaveBeenCalled();
            expect(readVersion(workflowGlsp)).toBe('2.8.0-next');
        });

        it('should leave workspace dependency ranges untouched for pnpm to resolve to exact versions', async () => {
            createRootPackage('2.8.0-next');
            const client = createPackage('packages/client/client', {
                name: '@eclipse-glsp/client',
                version: '2.8.0-next',
                dependencies: { '@eclipse-glsp/sprotty': 'workspace:*', snabbdom: '~3.5.1' }
            });
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['packages/client/client/src/change.ts'] });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([client]);

            await publish('next', makeOptions());

            const written = JSON.parse(fs.readFileSync(client.filePath, 'utf8'));
            expect(written.version).toBe('2.8.0-next.42');
            expect(written.dependencies['@eclipse-glsp/sprotty']).toBe('workspace:*');
            expect(written.dependencies.snabbdom).toBe('~3.5.1');
        });

        it('should fall back to a full publish when an unaffected package has no published next version', async () => {
            const { protocol, client } = createWorkspace();
            // npm view fails (no distTagVersion stubbed) -> unaffected packages were never published,
            // exact pins on them could dangle
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['packages/client/client/src/change.ts'] });

            await publish('next', makeOptions());

            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag next --no-git-checks --report-summary');
            expect(readVersion(protocol)).toBe('2.8.0-next.42');
            expect(readVersion(client)).toBe('2.8.0-next.42');
        });

        it('should publish nothing when no package directory is affected', async () => {
            const { protocol } = createWorkspace();
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['README.md', '.github/workflows/ci.yml'] });

            await publish('next', makeOptions());

            expect(execAsyncStub).not.toHaveBeenCalled();
            expect(readVersion(protocol)).toBe('2.8.0-next');
        });

        it('should perform a full publish when the root tsconfig changed', async () => {
            createWorkspace();
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['tsconfig.json'] });

            await publish('next', makeOptions());

            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag next --no-git-checks --report-summary');
        });

        it('should fall back to a full publish when the --since ref is not an ancestor of HEAD', async () => {
            const { protocol, client } = createWorkspace();
            stubGit('v2.7.0', '42');

            await publish('next', makeOptions({ since: 'origin/unrelated' }));

            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag next --no-git-checks --report-summary');
            expect(readVersion(protocol)).toBe('2.8.0-next.42');
            expect(readVersion(client)).toBe('2.8.0-next.42');
        });

        it('should ignore the baseline and publish all packages with --full', async () => {
            createWorkspace();
            stubGit('v2.7.0', '42', { baselineAncestor: true, changedFiles: ['packages/client/client/src/change.ts'] });

            await publish('next', makeOptions({ full: true }));

            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag next --no-git-checks --report-summary');
        });

        it('should pass package filters and --dry-run without writing versions in dry-run mode', async () => {
            const { client } = createWorkspace();
            stubGit('v2.7.0', '42', {
                baselineAncestor: true,
                changedFiles: ['packages/client/client/src/change.ts'],
                distTagVersion: '2.8.0-next.30'
            });

            await publish('next', makeOptions({ dryRun: true }));

            const cmd = execAsyncStub.mock.calls[0][0] as string;
            expect(cmd).toContain('--filter @eclipse-glsp/client');
            expect(cmd).toContain('--dry-run');
            expect(readVersion(client)).toBe('2.8.0-next');
        });
    });

    describe('publish latest', () => {
        it('should refuse the --since and --full options for latest publishing', async () => {
            createRootPackage('2.9.0');
            for (const overrides of [{ since: 'v2.8.0' }, { full: true }]) {
                try {
                    await publish('latest', makeOptions(overrides));
                    expect.fail('should have thrown');
                } catch (error) {
                    expect((error as Error).message).toContain("only supported for 'next' publishing");
                }
            }
        });

        it('should refuse to publish next versions under the latest dist-tag', async () => {
            createRootPackage('2.8.0-next');
            try {
                await publish('latest', makeOptions());
                expect.fail('should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain("Refusing to publish under the 'latest' dist-tag");
            }
        });

        it('should publish with --tag latest when unpublished packages exist', async () => {
            createRootPackage('2.9.0');
            const pkgA = createPackage('packages/a', {
                name: '@eclipse-glsp/a',
                version: '2.9.0',
                dependencies: { '@eclipse-glsp/b': 'workspace:*' }
            });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
            // npm view fails -> version does not exist yet
            execStub.mockImplementation((cmd: string) => {
                if (/npm view/.test(cmd)) {
                    throw new Error('404');
                }
                return undefined;
            });

            await publish('latest', makeOptions());

            expect(execAsyncStub).toHaveBeenCalledOnce();
            expect(execAsyncStub.mock.calls[0][0]).toBe('pnpm publish -r --tag latest --no-git-checks --report-summary');
            // release publishes leave the manifests untouched; pnpm resolves workspace: ranges to exact versions
            const written = JSON.parse(fs.readFileSync(pkgA.filePath, 'utf8'));
            expect(written.dependencies['@eclipse-glsp/b']).toBe('workspace:*');
        });

        it('should skip publishing when all package versions already exist', async () => {
            createRootPackage('2.9.0');
            const pkgA = createPackage('packages/a', { name: '@eclipse-glsp/a', version: '2.9.0' });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA]);
            // npm view returns the version -> already published
            execStub.mockImplementation((cmd: string) => {
                if (/npm view/.test(cmd)) {
                    return '2.9.0';
                }
                return undefined;
            });

            await publish('latest', makeOptions());

            expect(execAsyncStub).not.toHaveBeenCalled();
        });

        it('should ignore private packages when checking for unpublished versions', async () => {
            createRootPackage('2.9.0');
            const pkgA = createPackage('packages/a', { name: '@eclipse-glsp/a', version: '2.9.0' });
            const examplePkg = createPackage('examples/e', { name: '@eclipse-glsp-examples/e', version: '2.9.0', private: true });
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([pkgA, examplePkg]);
            execStub.mockImplementation((cmd: string) => {
                if (/npm view @eclipse-glsp\/a/.test(cmd)) {
                    return '2.9.0';
                }
                return undefined;
            });

            await publish('latest', makeOptions());

            // the only public package is already published -> nothing to publish
            expect(execAsyncStub).not.toHaveBeenCalled();
        });
    });

    describe('publish summary', () => {
        it('should report and remove the pnpm publish summary', async () => {
            createRootPackage('2.8.0-next');
            stubGit('v2.7.0', '7');
            vi.spyOn(packageUtil, 'getWorkspacePackages').mockReturnValue([]);
            const summaryPath = path.join(tempDir, 'pnpm-publish-summary.json');
            execAsyncStub.mockImplementation(() => {
                fs.writeFileSync(
                    summaryPath,
                    JSON.stringify({ publishedPackages: [{ name: '@eclipse-glsp/a', version: '2.8.0-next.7' }] })
                );
                return Promise.resolve('');
            });

            await publish('next', makeOptions());

            expect(fs.existsSync(summaryPath)).toBe(false);
        });
    });
});
