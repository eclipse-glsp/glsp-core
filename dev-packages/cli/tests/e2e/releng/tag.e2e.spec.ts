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

// Read-only against the real eclipse-glsp/glsp-server: both cases stop before anything is signed or pushed.
describe.skipIf(!isGhAuthenticated())('releng tag', () => {
    let tempDir: string;
    let repoDir: string;

    beforeAll(() => {
        tempDir = createTempDir();
        repoDir = `${tempDir}/glsp-server`;
        execSync(`git clone -q --depth 1 --filter=blob:none https://github.com/eclipse-glsp/glsp-server.git ${repoDir}`);
    });

    afterAll(() => cleanupTempDir(tempDir));

    it('refuses a version without a merged release PR', () => {
        const result = runCli(['releng', 'tag', '99.0.0', '-r', repoDir, '--dry-run']);
        expect(result.exitCode, cliDiag(result)).not.toBe(0);
        expect(result.stderr).toContain('eclipse-glsp/glsp-server has no merged release PR from release-v99.0.0');
    });

    it('refuses an existing tag that the publishing workflows would reject', () => {
        // v2.8.0 predates signed release tags
        const result = runCli(['releng', 'tag', '2.8.0', '-r', repoDir, '--dry-run']);
        expect(result.exitCode, cliDiag(result)).not.toBe(0);
        expect(result.stderr).toContain('v2.8.0 already exists on ace422a3b2b33ed25d1eabeb8cdfdf6aeef6cf8d (verified: false, unsigned)');
    });
});
