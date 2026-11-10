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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChangelogStatus } from '../../../src/commands/releng/changelog';
import { cliDiag, runCli } from '../../helpers/cli-helper';
import { commitFile, createTempGitRepo } from '../../helpers/git-helper';
import { cleanupTempDir } from '../../helpers/test-helper';

const CHANGELOG = '# Changelog\n\n## v2.1.0 - active\n\n### Changes\n';

describe('releng changelog', () => {
    let repoDir: string;
    const git = (args: string): string => execSync(`git ${args}`, { cwd: repoDir, encoding: 'utf-8' }).trim();
    const commit = (subject: string, file = 'src.ts', author?: string): string => {
        fs.writeFileSync(path.join(repoDir, file), `${subject}\n`, { flag: 'a' });
        git('add .');
        git(`${author ? `-c user.name="${author}" ` : ''}commit -q -m "${subject}"`);
        return git('rev-parse HEAD');
    };
    const changelog = (content: string, subject = 'Update changelog'): string => {
        commitFile(repoDir, 'CHANGELOG.md', content, subject);
        return git('rev-parse HEAD');
    };
    const changelogStatus = (): ChangelogStatus => {
        const result = runCli(['releng', 'changelog', '-r', repoDir, '--json']);
        expect(result.exitCode, cliDiag(result)).toBe(0);
        return JSON.parse(result.stdout);
    };
    const states = (): Record<string, string> =>
        Object.fromEntries(changelogStatus().commits.map(c => [c.subject, `${c.state}${c.reason ? ` (${c.reason})` : ''}`]));

    beforeEach(() => {
        repoDir = createTempGitRepo();
        git('config commit.gpgsign false');
        git('config tag.gpgsign false');
        git('remote add origin https://github.com/eclipse-glsp/glsp-server.git');
        changelog(CHANGELOG, 'v2.0.0');
        git('tag v2.0.0');
    });

    afterEach(() => cleanupTempDir(repoDir));

    it('starts at the last release tag without a marker and classifies the commits', () => {
        commit('GLSP-1: Add a feature (#10)');
        commit('Bump the npm group (#11)', 'deps.json', 'dependabot[bot]');
        commit('Switch to 2.2.0-next versions (#12)');
        commit('Fix CI (#13)');
        changelog(
            `${CHANGELOG}\n- [feature] Add a feature [#10](https://github.com/eclipse-glsp/glsp-server/pull/10)\n`,
            'Add entries (#14)'
        );

        expect(states()).toEqual({
            'GLSP-1: Add a feature (#10)': 'covered (#10 is in the changelog)',
            'Bump the npm group (#11)': 'skipped (dependabot)',
            'Switch to 2.2.0-next versions (#12)': 'skipped (version switch)',
            'Fix CI (#13)': 'pending',
            'Add entries (#14)': 'skipped (changelog update)'
        });
        const status = changelogStatus();
        expect(status.baseline).toEqual({ kind: 'tag', ref: 'v2.0.0' });
        expect(status.pending.map(c => c.url)).toEqual(['https://github.com/eclipse-glsp/glsp-server/pull/13']);
    });

    it('starts at the marker, so commits that were decided on before it are not reported again', () => {
        commit('Fix CI (#13)');
        const marker = git('rev-parse HEAD');
        changelog(`${CHANGELOG.replace('# Changelog\n', `# Changelog\n\n<!-- changelog-generated-up-to: ${marker} -->\n`)}`);
        commit('GLSP-2: Fix a bug (#15)');

        const status = changelogStatus();
        expect(status.baseline).toEqual({ kind: 'marker', ref: marker });
        expect(status.commits.map(c => c.subject)).toEqual(['GLSP-2: Fix a bug (#15)', 'Update changelog']);
        expect(status.pending.map(c => c.pr)).toEqual([15]);
    });

    it('does not match the PR of another repository with the same number', () => {
        commit('Fix a bug (#7)');
        changelog(`${CHANGELOG}\n- Fix a bug [#7](https://github.com/eclipse-glsp/glsp-client/pull/7)\n`);
        expect(states()['Fix a bug (#7)']).toBe('pending');
    });

    it('rejects a marker that is not part of the history', () => {
        changelog(`<!-- changelog-generated-up-to: ${'f'.repeat(40)} -->\n${CHANGELOG}`);
        const result = runCli(['releng', 'changelog', '-r', repoDir, '--json']);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toMatch(/marker f+ is not a commit/);
    });
});
