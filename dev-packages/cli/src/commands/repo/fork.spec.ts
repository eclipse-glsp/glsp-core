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
import * as processUtil from '../../util/process-util';
import * as forkUtils from './common/fork-utils';
import { RemoteInfo, analyzeForkRemotes, getRemoteUrl, remoteMatchesOrg } from './common/fork-utils';
import { createTempDir, cleanupTempDir } from '../../../tests/helpers/test-helper';
import { configureForkRemote } from './fork';

describe('fork-utils', () => {
    describe('getRemoteUrl', () => {
        it('should return SSH URL for ssh protocol', () => {
            expect(getRemoteUrl('ssh', 'myuser', 'glsp-core')).toBe('git@github.com:myuser/glsp-core.git');
        });

        it('should return HTTPS URL for https protocol', () => {
            expect(getRemoteUrl('https', 'myuser', 'glsp-core')).toBe('https://github.com/myuser/glsp-core.git');
        });

        it('should return HTTPS URL for gh protocol', () => {
            expect(getRemoteUrl('gh', 'myuser', 'glsp-core')).toBe('https://github.com/myuser/glsp-core.git');
        });
    });

    describe('remoteMatchesOrg', () => {
        it('should match HTTPS URL', () => {
            expect(remoteMatchesOrg('https://github.com/eclipse-glsp/glsp-core.git', 'eclipse-glsp', 'glsp-core')).toBe(true);
        });

        it('should match SSH URL', () => {
            expect(remoteMatchesOrg('git@github.com:eclipse-glsp/glsp-core.git', 'eclipse-glsp', 'glsp-core')).toBe(true);
        });

        it('should not match different org', () => {
            expect(remoteMatchesOrg('https://github.com/myuser/glsp-core.git', 'eclipse-glsp', 'glsp-core')).toBe(false);
        });

        it('should not match different repo', () => {
            expect(remoteMatchesOrg('https://github.com/eclipse-glsp/glsp-theia-integration.git', 'eclipse-glsp', 'glsp-core')).toBe(false);
        });
    });

    describe('analyzeForkRemotes', () => {
        const forkUser = 'myuser';
        const repo = 'glsp-core';

        it('should return already-configured when origin=fork and upstream=eclipse-glsp', () => {
            const remotes: RemoteInfo = {
                origin: 'git@github.com:myuser/glsp-core.git',
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('already-configured');
        });

        it('should return rename-origin when origin=eclipse-glsp and no upstream', () => {
            const remotes: RemoteInfo = {
                origin: 'https://github.com/eclipse-glsp/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('rename-origin');
        });

        it('should return set-origin when origin=eclipse-glsp and upstream=eclipse-glsp', () => {
            const remotes: RemoteInfo = {
                origin: 'https://github.com/eclipse-glsp/glsp-core.git',
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('set-origin');
        });

        it('should return unexpected when origin=eclipse-glsp and upstream=something-else', () => {
            const remotes: RemoteInfo = {
                origin: 'https://github.com/eclipse-glsp/glsp-core.git',
                upstream: 'https://github.com/other-org/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('unexpected');
        });

        it('should return unexpected when origin is unknown org', () => {
            const remotes: RemoteInfo = {
                origin: 'https://github.com/other-org/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('unexpected');
        });

        it('should return unexpected when no remotes exist', () => {
            const remotes: RemoteInfo = {};
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('unexpected');
        });

        it('should return unexpected when only upstream exists', () => {
            const remotes: RemoteInfo = {
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('unexpected');
        });

        it('should handle SSH URLs for eclipse-glsp origin', () => {
            const remotes: RemoteInfo = {
                origin: 'git@github.com:eclipse-glsp/glsp-core.git'
            };
            expect(analyzeForkRemotes(remotes, forkUser, repo)).toBe('rename-origin');
        });
    });
});

describe('fork-action', () => {
    let tempDir: string;
    let execStub: MockInstance;
    let ensureForkStub: MockInstance;
    let getRemotesStub: MockInstance;

    beforeEach(() => {
        tempDir = createTempDir();
        execStub = vi.spyOn(processUtil, 'exec').mockReturnValue('');
        ensureForkStub = vi.spyOn(forkUtils, 'ensureFork').mockResolvedValue(undefined);
        getRemotesStub = vi.spyOn(forkUtils, 'getRemotes').mockReturnValue(undefined as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanupTempDir(tempDir);
    });

    function createRepoDir(repo: string): string {
        const repoDir = path.join(tempDir, repo);
        fs.mkdirSync(repoDir, { recursive: true });
        return repoDir;
    }

    describe('configureForkRemote', () => {
        it('should rename origin and add fork for rename-origin flow', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/eclipse-glsp/glsp-core.git' });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'ssh');

            expect(ensureForkStub).toHaveBeenCalledExactlyOnceWith('myuser', 'glsp-core');
            const calls = execStub.mock.calls.map(c => c[0] as string);
            expect(calls).toContain('git remote rename origin upstream');
            const addOrigin = calls.find(c => c.includes('git remote add origin'));
            expect(addOrigin).toBeDefined();
            expect(addOrigin).toContain('git@github.com:myuser/glsp-core.git');
        });

        it('should set origin URL for set-origin flow', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({
                origin: 'https://github.com/eclipse-glsp/glsp-core.git',
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'https');

            expect(ensureForkStub).toHaveBeenCalledExactlyOnceWith('myuser', 'glsp-core');
            const calls = execStub.mock.calls.map(c => c[0] as string);
            const setUrl = calls.find(c => c.includes('git remote set-url origin'));
            expect(setUrl).toBeDefined();
            expect(setUrl).toContain('https://github.com/myuser/glsp-core.git');
        });

        it('should skip when already configured', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({
                origin: 'git@github.com:myuser/glsp-core.git',
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'ssh');

            expect(ensureForkStub).not.toHaveBeenCalled();
            expect(execStub).not.toHaveBeenCalled();
        });

        it('should skip when remotes are unexpected', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/other-org/glsp-core.git' });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'ssh');

            expect(ensureForkStub).not.toHaveBeenCalled();
            expect(execStub).not.toHaveBeenCalled();
        });

        it('should use ssh URL when protocol is ssh', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/eclipse-glsp/glsp-core.git' });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'ssh');

            const addOriginCall = execStub.mock.calls.find(c => (c[0] as string).includes('git remote add origin'));
            expect(addOriginCall![0]).toContain('git@github.com:myuser/glsp-core.git');
        });

        it('should use https URL when protocol is https', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/eclipse-glsp/glsp-core.git' });

            await configureForkRemote('glsp-core', repoDir, 'myuser', 'https');

            const addOriginCall = execStub.mock.calls.find(c => (c[0] as string).includes('git remote add origin'));
            expect(addOriginCall![0]).toContain('https://github.com/myuser/glsp-core.git');
        });

        it('should pass correct cwd for git commands', async () => {
            const repoDir = createRepoDir('glsp-theia-integration');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/eclipse-glsp/glsp-theia-integration.git' });

            await configureForkRemote('glsp-theia-integration', repoDir, 'myuser', 'ssh');

            for (const call of execStub.mock.calls) {
                expect(call[1]).toHaveProperty('cwd', repoDir);
            }
        });

        it('should call ensureFork for rename-origin', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({ origin: 'https://github.com/eclipse-glsp/glsp-core.git' });

            await configureForkRemote('glsp-core', repoDir, 'testuser', 'ssh');

            expect(ensureForkStub).toHaveBeenCalledExactlyOnceWith('testuser', 'glsp-core');
        });

        it('should call ensureFork for set-origin', async () => {
            const repoDir = createRepoDir('glsp-core');
            getRemotesStub.mockReturnValue({
                origin: 'https://github.com/eclipse-glsp/glsp-core.git',
                upstream: 'https://github.com/eclipse-glsp/glsp-core.git'
            });

            await configureForkRemote('glsp-core', repoDir, 'testuser', 'https');

            expect(ensureForkStub).toHaveBeenCalledExactlyOnceWith('testuser', 'glsp-core');
        });
    });
});
