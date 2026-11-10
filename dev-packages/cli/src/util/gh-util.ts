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

import { exec } from './process-util';

/** Runs a `gh` command and parses its JSON output. */
export function ghJson<T>(args: string): T {
    return JSON.parse(exec(`gh ${args}`, { silent: true })) as T;
}

/** Like {@link ghJson}, but returns `undefined` if the command fails (e.g. a 404 of `gh api`). */
export function tryGhJson<T>(args: string): T | undefined {
    try {
        return ghJson<T>(args);
    } catch {
        return undefined;
    }
}

export function getGitHubLogin(): string {
    return exec('gh api user --jq .login', { silent: true });
}

export function hasPushAccess(slug: string): boolean {
    return exec(`gh api repos/${slug} --jq .permissions.push`, { silent: true }) === 'true';
}

export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface PullRequestInfo {
    number: number;
    url: string;
    state: PullRequestState;
    mergeCommit?: { oid: string } | null;
}

const PR_FIELDS = 'number,url,state,mergeCommit';

/** Returns the most relevant PR of the given head branch: an open or merged one before a closed one. */
export function findPullRequest(slug: string, head: string): PullRequestInfo | undefined {
    const prs = ghJson<PullRequestInfo[]>(`pr list --repo ${slug} --head ${head} --state all --json ${PR_FIELDS}`);
    return prs.find(pr => pr.state !== 'CLOSED') ?? prs[0];
}

/** Returns the open PRs from `release-v<version>` branches. */
export function findOpenReleasePullRequests(slug: string): (PullRequestInfo & { headRefName: string })[] {
    return ghJson<(PullRequestInfo & { headRefName: string })[]>(
        `pr list --repo ${slug} --state open --limit 100 --json ${PR_FIELDS},headRefName`
    ).filter(pr => pr.headRefName.startsWith('release-v'));
}

export function getPullRequest(slug: string, prNumber: number): PullRequestInfo {
    return ghJson<PullRequestInfo>(`pr view ${prNumber} --repo ${slug} --json ${PR_FIELDS}`);
}

/** An entry of `statusCheckRollup`: either a check run or a commit status. */
export interface CheckRollupEntry {
    __typename: 'CheckRun' | 'StatusContext';
    name?: string;
    context?: string;
    status?: string;
    conclusion?: string;
    state?: string;
    detailsUrl?: string;
    targetUrl?: string;
}

export interface ChecksSummary {
    total: number;
    pending: string[];
    failed: { name: string; url?: string }[];
}

const FAILED_CONCLUSIONS = ['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'];

export function summarizeChecks(rollup: CheckRollupEntry[]): ChecksSummary {
    const summary: ChecksSummary = { total: rollup.length, pending: [], failed: [] };
    for (const entry of rollup) {
        const name = entry.name ?? entry.context ?? 'unknown';
        if (entry.__typename === 'StatusContext') {
            if (entry.state === 'FAILURE' || entry.state === 'ERROR') {
                summary.failed.push({ name, url: entry.targetUrl });
            } else if (entry.state !== 'SUCCESS') {
                summary.pending.push(name);
            }
        } else if (entry.status !== 'COMPLETED') {
            summary.pending.push(name);
        } else if (FAILED_CONCLUSIONS.includes(entry.conclusion ?? '')) {
            summary.failed.push({ name, url: entry.detailsUrl });
        }
    }
    return summary;
}

export function getPullRequestChecks(slug: string, prNumber: number): ChecksSummary {
    const { statusCheckRollup } = ghJson<{ statusCheckRollup: CheckRollupEntry[] }>(
        `pr view ${prNumber} --repo ${slug} --json statusCheckRollup`
    );
    return summarizeChecks(statusCheckRollup ?? []);
}

/**
 * Returns the CI of a commit on a branch: the workflow runs triggered by pushing it. Unrelated runs that
 * GitHub attaches to the branch head (Dependabot, schedules, `workflow_run` follow-ups) are left out.
 */
export function getCommitChecks(slug: string, sha: string, branch: string): ChecksSummary {
    const runs = ghJson<{ workflowName: string; status: string; conclusion: string; url: string }[]>(
        `run list --repo ${slug} --commit ${sha} --branch ${branch} --event push --limit 100 --json workflowName,status,conclusion,url`
    );
    return summarizeChecks(
        runs.map(run => ({
            __typename: 'CheckRun',
            name: run.workflowName,
            status: run.status.toUpperCase(),
            conclusion: run.conclusion.toUpperCase(),
            detailsUrl: run.url
        }))
    );
}

export interface Verification {
    verified: boolean;
    reason: string;
}

export function getCommitVerification(slug: string, sha: string): Verification {
    return ghJson<Verification>(`api repos/${slug}/commits/${sha} --jq .commit.verification`);
}

export interface RemoteTag {
    /** The commit the tag points at */
    commit: string;
    /** Signature verification of the tag object; lightweight tags have none */
    verification: Verification;
}

/** Returns the remote tag, or `undefined` if it does not exist. */
export function getRemoteTag(slug: string, tag: string): RemoteTag | undefined {
    const ref = tryGhJson<{ object: { sha: string; type: string } }>(`api repos/${slug}/git/ref/tags/${tag}`);
    if (!ref) {
        return undefined;
    }
    if (ref.object.type !== 'tag') {
        return { commit: ref.object.sha, verification: { verified: false, reason: 'lightweight tag' } };
    }
    const tagObject = ghJson<{ object: { sha: string }; verification: Verification }>(`api repos/${slug}/git/tags/${ref.object.sha}`);
    return { commit: tagObject.object.sha, verification: tagObject.verification };
}

export function releaseExists(slug: string, tag: string): boolean {
    return tryGhJson(`release view ${tag} --repo ${slug} --json tagName`) !== undefined;
}

export interface WorkflowRun {
    databaseId: number;
    attempt: number;
    workflowName: string;
    status: string;
    conclusion: string;
    url: string;
}

/** Returns the runs of the given workflow that were triggered by pushing the tag (newest first). */
export function getTagRuns(slug: string, workflow: string, tag: string): WorkflowRun[] {
    return ghJson<WorkflowRun[]>(
        `run list --repo ${slug} --workflow ${workflow} --event push --branch ${tag} --json databaseId,attempt,workflowName,status,conclusion,url`
    );
}
