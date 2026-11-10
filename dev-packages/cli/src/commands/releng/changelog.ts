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

import { LOGGER, baseCommand, configureLogger, exec, validateGitDirectory } from '../../util';
import { getLastReleaseTag } from './common';

/** Written by the changelog skills: all commits up to this one are reflected in the changelog. */
export const CHANGELOG_MARKER = /<!--\s*changelog-generated-up-to:\s*([0-9a-f]{7,40})\s*-->/;

export type ChangelogCommitState = 'covered' | 'skipped' | 'pending';

export interface ChangelogCommit {
    sha: string;
    subject: string;
    author: string;
    /** The PR number of a squash-merged PR, parsed from the `(#<n>)` suffix of the subject */
    pr?: number;
    url?: string;
    state: ChangelogCommitState;
    /** Why the commit is covered or skipped */
    reason?: string;
}

export interface ChangelogStatus {
    /** The commit range start: the marker commit, or the last release tag if there is no marker */
    baseline: { kind: 'marker' | 'tag'; ref: string };
    head: string;
    commits: ChangelogCommit[];
    pending: ChangelogCommit[];
}

interface ChangelogCmdOptions {
    repoDir: string;
    json: boolean;
}

export const ChangelogCommand = baseCommand()
    .name('changelog')
    .description(
        'List the commits since the changelog was last generated (its marker, or the last release tag) that have no changelog entry yet'
    )
    .option('-r, --repoDir <repoDir>', 'Path to the repository', validateGitDirectory, process.cwd())
    .option('--json', 'Print the result as JSON', false)
    .action((options: ChangelogCmdOptions) => {
        configureLogger(options.json ? 'warn' : 'info');
        const status = getChangelogStatus(options.repoDir);
        if (options.json) {
            console.log(JSON.stringify(status, undefined, 2));
            return;
        }
        LOGGER.info(`Commits since ${status.baseline.kind} ${status.baseline.ref} (up to ${status.head}):`);
        for (const commit of status.commits) {
            LOGGER.info(
                ` ${commit.state.padEnd(8)} ${commit.sha.substring(0, 8)} ${commit.subject}${commit.reason ? ` (${commit.reason})` : ''}`
            );
        }
        LOGGER.info(
            status.pending.length === 0 ? 'The changelog is up to date.' : `${status.pending.length} commit(s) need a changelog decision.`
        );
    });

/**
 * Classifies the commits since the changelog was last generated. A commit is covered if the changelog
 * references its PR, skipped if it never needs an entry (dependabot, version bumps, changelog updates),
 * and pending otherwise.
 */
export function getChangelogStatus(repoDir: string, head = 'HEAD'): ChangelogStatus {
    const git = (cmd: string): string => exec(`git ${cmd}`, { cwd: repoDir, silent: true });
    const changelog = git(`show ${head}:CHANGELOG.md`);
    const headSha = git(`rev-parse ${head}`);
    const baseline = getBaseline(repoDir, changelog, headSha);
    const repoName = getRepoName(git('remote get-url origin'));

    const log = git(`log --first-parent --format=%H%x09%an%x09%s ${baseline.ref}..${headSha}`);
    const commits = log
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
            const [sha, author, subject] = line.split('\t');
            const pr = Number(subject.match(/\(#(\d+)\)$/)?.[1]) || undefined;
            const files = (): string[] => git(`show --first-parent --name-only --format= ${sha}`).split('\n').filter(Boolean);
            return {
                sha,
                subject,
                author,
                pr,
                url: pr ? `https://github.com/eclipse-glsp/${repoName}/pull/${pr}` : undefined,
                ...classify({ subject, author, pr, files }, changelog, repoName)
            };
        });
    return { baseline, head: headSha, commits, pending: commits.filter(commit => commit.state === 'pending') };
}

function getBaseline(repoDir: string, changelog: string, headSha: string): ChangelogStatus['baseline'] {
    const marker = changelog.match(CHANGELOG_MARKER)?.[1];
    if (marker) {
        try {
            exec(`git merge-base --is-ancestor ${marker} ${headSha}`, { cwd: repoDir, silent: true });
        } catch {
            throw new Error(`The changelog marker ${marker} is not a commit of the checked out history.`);
        }
        return { kind: 'marker', ref: marker };
    }
    const tag = getLastReleaseTag(repoDir);
    if (!tag) {
        throw new Error('The changelog has no marker and the repository has no release tag to start from.');
    }
    return { kind: 'tag', ref: tag };
}

function getRepoName(remoteUrl: string): string {
    const name = remoteUrl.match(/([^/:]+?)(\.git)?$/)?.[1];
    if (!name) {
        throw new Error(`Could not derive the repository name from ${remoteUrl}`);
    }
    return name;
}

interface CommitInfo {
    subject: string;
    author: string;
    pr?: number;
    files: () => string[];
}

const SKIPPED_SUBJECTS: [RegExp, string][] = [
    [/^Switch to .*(-next|nightly)/i, 'version switch'],
    [/^v\d+\.\d+\.\d+\b/, 'release commit'],
    [/^Release v\d/i, 'release commit'],
    [/update changelog/i, 'changelog update']
];

function classify(commit: CommitInfo, changelog: string, repoName: string): Pick<ChangelogCommit, 'state' | 'reason'> {
    if (commit.pr && changelog.includes(`${repoName}/pull/${commit.pr})`)) {
        return { state: 'covered', reason: `#${commit.pr} is in the changelog` };
    }
    if (/^dependabot/.test(commit.author)) {
        return { state: 'skipped', reason: 'dependabot' };
    }
    const skipped = SKIPPED_SUBJECTS.find(([pattern]) => pattern.test(commit.subject));
    if (skipped) {
        return { state: 'skipped', reason: skipped[1] };
    }
    const files = commit.files();
    if (files.length > 0 && files.every(file => file === 'CHANGELOG.md')) {
        return { state: 'skipped', reason: 'changelog update' };
    }
    return { state: 'pending' };
}
