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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ReleaseCheck } from '../../../src/commands/releng/release-checks';
import type { ReleaseStatus } from '../../../src/commands/releng/release-state';
import { cliDiag, runCli } from '../../helpers/cli-helper';
import { cleanupTempDir, createTempDir } from '../../helpers/test-helper';

function isGhAuthenticated(): boolean {
    try {
        execSync('gh auth status', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Read-only against the real eclipse-glsp/glsp-server: nothing is pushed, tagged or opened.
describe.skipIf(!isGhAuthenticated())('releng release (read-only)', () => {
    let workdir: string;
    const release = (...args: string[]): ReturnType<typeof runCli> =>
        runCli(['releng', 'release', ...args, '--repo', 'glsp-server', '--workdir', workdir]);

    beforeAll(() => {
        workdir = createTempDir();
    });

    afterAll(() => cleanupTempDir(workdir));

    it('reports the phase of the release and what happens next', () => {
        const result = release('status', '--json');
        expect(result.exitCode, cliDiag(result)).toBe(0);
        const status: ReleaseStatus = JSON.parse(result.stdout);
        expect(status.slug).toBe('eclipse-glsp/glsp-server');
        expect(['idle', 'pr-open', 'merged', 'tagged', 'publishing', 'published']).toContain(status.phase);
        expect(['cli', 'review', 'wait', 'fix']).toContain(status.next.actor);
        expect(status.branchVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('checks all preconditions of a release without changing anything', () => {
        const result = release('check', 'minor', '--json');
        expect([0, 1], cliDiag(result)).toContain(result.exitCode);
        const { checks }: { checks: ReleaseCheck[] } = JSON.parse(result.stdout);
        expect(checks.map(check => check.name)).toEqual([
            'push access',
            'toolchain',
            'signing',
            'no release in progress',
            'version',
            'dependencies',
            'CI',
            'changelog section',
            'changelog up to date'
        ]);
        expect(result.exitCode).toBe(checks.some(check => check.result === 'fail') ? 1 : 0);
    });

    it('refuses to tag before the release PR is merged and green', () => {
        const status: ReleaseStatus = JSON.parse(release('status', '--json').stdout);
        const result = release('tag', '--dry-run');
        if (status.next.actor === 'cli' && ['merged', 'tagged'].includes(status.phase)) {
            expect(result.exitCode, cliDiag(result)).toBe(0);
            expect(result.stdout).toContain('Dry run');
        } else {
            expect(result.exitCode).not.toBe(0);
            expect(result.stderr + result.stdout).toContain(`phase '${status.phase}'`);
        }
    });
});
