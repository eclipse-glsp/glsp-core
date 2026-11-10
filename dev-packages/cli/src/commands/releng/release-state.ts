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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import {
    ChecksSummary,
    GLSPRepo,
    LOGGER,
    PullRequestInfo,
    RemoteTag,
    WorkflowRun,
    checkGHCli,
    exec,
    findOpenReleasePullRequests,
    findPullRequest,
    getCommitChecks,
    getPullRequestChecks,
    getRemoteTag,
    getTagRuns,
    releaseExists
} from '../../util';
import { getLocalVersion } from './common';
import { getReleaseTargets } from './release-targets';

/** A release repository and its clone, which all release steps work on. */
export interface ReleaseRepo {
    repo: GLSPRepo;
    owner: string;
    slug: string;
    defaultBranch: string;
    /** A clone on the head of the default branch */
    repoDir: string;
}

export interface ReleaseRepoOptions {
    repo: GLSPRepo;
    owner: string;
    /** Parent directory of the clone; a per-owner cache directory by default */
    workdir?: string;
}

export function defaultWorkdir(owner: string): string {
    const cache = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    return path.join(cache, 'glsp-releng', owner);
}

/** Clones the repository into the workdir, or updates the existing clone to the head of the default branch. */
export function openReleaseRepo(options: ReleaseRepoOptions): ReleaseRepo {
    checkGHCli();
    const slug = `${options.owner}/${options.repo}`;
    const defaultBranch = exec(`gh repo view ${slug} --json defaultBranchRef --jq .defaultBranchRef.name`, { silent: true });
    const repoDir = path.join(path.resolve(options.workdir ?? defaultWorkdir(options.owner)), options.repo);
    if (!fs.existsSync(repoDir)) {
        LOGGER.info(`Cloning ${slug} into ${repoDir}`);
        fs.mkdirSync(path.dirname(repoDir), { recursive: true });
        exec(`gh repo clone ${slug} ${repoDir}`, { silent: true });
    } else {
        LOGGER.debug(`Updating the clone ${repoDir}`);
        exec('git fetch origin --tags --force --prune', { cwd: repoDir, silent: true });
        // the clone is owned by the release commands, so leftovers of an earlier step are discarded
        exec(`git checkout -f -B ${defaultBranch} origin/${defaultBranch}`, { cwd: repoDir, silent: true });
        exec('git clean -fd', { cwd: repoDir, silent: true });
        deleteLocalBranches(repoDir, defaultBranch);
    }
    // without a default, `gh pr create` in a clone of a fork targets the parent repository
    exec(`gh repo set-default ${slug}`, { cwd: repoDir, silent: true });
    return { repo: options.repo, owner: options.owner, slug, defaultBranch, repoDir };
}

/** Removes the local release branches of earlier (dry) runs, which `releng prepare` would fail to create again. */
function deleteLocalBranches(repoDir: string, defaultBranch: string): void {
    const branches = exec("git branch --format='%(refname:short)' --list 'release-v*' 'nightly-*'", { cwd: repoDir, silent: true })
        .split('\n')
        .filter(branch => branch && branch !== defaultBranch);
    if (branches.length > 0) {
        exec(`git branch -D ${branches.join(' ')}`, { cwd: repoDir, silent: true });
    }
}

/** Updates the clone to the current head of the default branch. */
export function refreshReleaseRepo(ctx: ReleaseRepo): void {
    exec('git fetch origin --tags --force --prune', { cwd: ctx.repoDir, silent: true });
    exec(`git checkout -f -B ${ctx.defaultBranch} origin/${ctx.defaultBranch}`, { cwd: ctx.repoDir, silent: true });
}

/**
 * The phases of a release, derived from GitHub and the registries:
 * - `idle`: the default branch is on a development version and no release PR is open
 * - `pr-open`: the release PR is open
 * - `merged`: the release PR is merged, the tag is not pushed yet
 * - `tagged`: the tag is pushed, the GitHub release is missing
 * - `publishing`: the publishing workflows run, or the registries do not show the release yet
 * - `published`: the release is available; the default branch still has to switch to the next version
 */
export type ReleasePhase = 'idle' | 'pr-open' | 'merged' | 'tagged' | 'publishing' | 'published';

/**
 * Who has to act next:
 * - `cli`: run the given release command
 * - `review`: a committer has to review and squash merge the given PR
 * - `wait`: CI or publishing is running
 * - `fix`: something failed; fix it or re-run the failed jobs (see `problems`)
 */
export type ReleaseActor = 'cli' | 'review' | 'wait' | 'fix';

export interface ReleaseStatus {
    repo: GLSPRepo;
    slug: string;
    phase: ReleasePhase;
    /** The version on the default branch */
    branchVersion: string;
    /** The version being released; undefined when idle */
    version?: string;
    pr?: PullRequestInfo;
    /** The merge commit of the release PR */
    releaseCommit?: string;
    /** CI of the release PR (`pr-open`) or of the release commit (`merged`) */
    checks?: ChecksSummary;
    tag?: RemoteTag;
    githubRelease?: boolean;
    runs?: { workflow: string; run?: WorkflowRun }[];
    targets?: { label: string; published: boolean }[];
    /** The PR that switches the default branch to the next development version */
    nightlyPr?: PullRequestInfo;
    problems: string[];
    next: { actor: ReleaseActor; description: string; command?: string };
}

export function isDevelopmentVersion(version: string): boolean {
    return /-(next|SNAPSHOT)$/.test(version);
}

export function nextDevelopmentVersion(version: string): string {
    return `${semver.inc(version, 'minor')}-next`;
}

/** The release command for a step, e.g. `glsp releng release tag --repo glsp-server`. */
export function releaseCommand(ctx: Pick<ReleaseRepo, 'repo' | 'owner'>, step: string): string {
    const owner = ctx.owner === 'eclipse-glsp' ? '' : ` --owner ${ctx.owner}`;
    return `glsp releng release ${step} --repo ${ctx.repo}${owner}`;
}

/** Derives the state of the release from GitHub and the registries. Expects the clone on the head of the default branch. */
export async function getReleaseStatus(ctx: ReleaseRepo): Promise<ReleaseStatus> {
    const branchVersion = getLocalVersion(ctx.repoDir, ctx.repo);
    const base = { repo: ctx.repo, slug: ctx.slug, branchVersion, problems: [] as string[] };
    if (isDevelopmentVersion(branchVersion)) {
        return getDevelopmentStatus(ctx, base);
    }

    const version = branchVersion;
    const tag = `v${version}`;
    const pr = findPullRequest(ctx.slug, `release-v${version}`);
    if (pr?.state !== 'MERGED' || !pr.mergeCommit?.oid) {
        return {
            ...base,
            phase: 'merged',
            version,
            pr,
            problems: [
                `The default branch is on the release version ${version}, but there is no merged release PR from release-v${version}.`
            ],
            next: { actor: 'fix', description: 'Restore the development version on the default branch or merge the release PR' }
        };
    }
    const releaseCommit = pr.mergeCommit.oid;
    const merged = { ...base, version, pr, releaseCommit };

    const remoteTag = getRemoteTag(ctx.slug, tag);
    if (!remoteTag) {
        const checks = getCommitChecks(ctx.slug, releaseCommit, ctx.defaultBranch);
        return { ...merged, phase: 'merged', checks, ...checksNext(checks, `CI of the release commit ${releaseCommit}`, ctx) };
    }
    if (remoteTag.commit !== releaseCommit) {
        return {
            ...merged,
            phase: 'tagged',
            tag: remoteTag,
            problems: [`Tag ${tag} points at ${remoteTag.commit} instead of the release commit ${releaseCommit}.`],
            next: { actor: 'fix', description: `Delete the tag with 'git push origin --delete ${tag}' (nothing is published from it)` }
        };
    }
    if (!remoteTag.verification.verified) {
        return {
            ...merged,
            phase: 'tagged',
            tag: remoteTag,
            problems: [`Tag ${tag} is not verified on GitHub (${remoteTag.verification.reason}), so the publishing workflows reject it.`],
            next: { actor: 'fix', description: `Delete the tag with 'git push origin --delete ${tag}' and push a signed one` }
        };
    }

    const tagged = { ...merged, tag: remoteTag, githubRelease: releaseExists(ctx.slug, tag) };
    if (!tagged.githubRelease) {
        return {
            ...tagged,
            phase: 'tagged',
            next: { actor: 'cli', description: 'Create the GitHub release', command: releaseCommand(ctx, 'tag') }
        };
    }

    const releaseTargets = getReleaseTargets(ctx.repo, ctx.repoDir, version);
    const targets: { label: string; published: boolean }[] = [];
    for (const probe of releaseTargets.probes) {
        targets.push({ label: probe.label, published: await probe.isPublished() });
    }
    if (targets.every(target => target.published)) {
        const nightly = findPullRequest(ctx.slug, `nightly-${nextDevelopmentVersion(version)}`);
        const nightlyPr = nightly?.state === 'CLOSED' ? undefined : nightly;
        return {
            ...tagged,
            phase: 'published',
            targets,
            nightlyPr,
            next: nightlyPr
                ? { actor: 'review', description: `Review and squash merge ${nightlyPr.url}` }
                : {
                      actor: 'cli',
                      description: 'Switch the default branch to the next development version',
                      command: releaseCommand(ctx, 'next')
                  }
        };
    }

    const runs = releaseTargets.workflows.map(workflow => ({ workflow, run: getTagRuns(ctx.slug, workflow, tag).at(0) }));
    const failed = runs.filter(({ run }) => run?.status === 'completed' && run.conclusion !== 'success');
    const publishing = { ...tagged, phase: 'publishing' as const, targets, runs };
    if (failed.length > 0) {
        return {
            ...publishing,
            problems: failed.map(({ workflow, run }) => `The ${workflow} run finished with '${run!.conclusion}': ${run!.url}`),
            next: { actor: 'fix', description: 'Fix the cause and use "Re-run failed jobs" on GitHub' }
        };
    }
    const running = runs.filter(({ run }) => run?.status !== 'completed');
    return {
        ...publishing,
        next: {
            actor: 'wait',
            description:
                running.length > 0
                    ? `Publishing: ${running.map(({ workflow, run }) => (run ? `${workflow} ${run.url}` : `${workflow} (not started yet)`)).join(', ')}`
                    : `Waiting for the registries: ${targets
                          .filter(target => !target.published)
                          .map(target => target.label)
                          .join(', ')}`
        }
    };
}

function getDevelopmentStatus(ctx: ReleaseRepo, base: Pick<ReleaseStatus, 'repo' | 'slug' | 'branchVersion' | 'problems'>): ReleaseStatus {
    const prs = findOpenReleasePullRequests(ctx.slug);
    if (prs.length === 0) {
        return {
            ...base,
            phase: 'idle',
            next: {
                actor: 'cli',
                description: 'No release is in progress. Check the preconditions of a release and prepare it',
                command: releaseCommand(ctx, 'prepare <major|minor|patch>')
            }
        };
    }
    if (prs.length > 1) {
        return {
            ...base,
            phase: 'pr-open',
            problems: [`Found several open release PRs: ${prs.map(pr => pr.url).join(', ')}`],
            next: { actor: 'fix', description: 'Close all but one release PR' }
        };
    }
    const pr = prs[0];
    const checks = getPullRequestChecks(ctx.slug, pr.number);
    const status = { ...base, phase: 'pr-open' as const, version: pr.headRefName.substring('release-v'.length), pr, checks };
    const next = checksNext(checks, `CI of ${pr.url}`, ctx);
    if (next.next.actor === 'cli') {
        return { ...status, next: { actor: 'review', description: `Review and squash merge ${pr.url}` } };
    }
    return { ...status, ...next };
}

function checksNext(checks: ChecksSummary, what: string, ctx: ReleaseRepo): Pick<ReleaseStatus, 'problems' | 'next'> {
    if (checks.failed.length > 0) {
        return {
            problems: checks.failed.map(check => `${what} failed: ${check.name}${check.url ? ` ${check.url}` : ''}`),
            next: {
                actor: 'fix',
                description: 'Push a fix (to the release branch, if the PR is still open) or use "Re-run failed jobs" on GitHub'
            }
        };
    }
    if (checks.total === 0 || checks.pending.length > 0) {
        const progress = checks.total === 0 ? 'not started yet' : `${checks.total - checks.pending.length}/${checks.total} done`;
        return { problems: [], next: { actor: 'wait', description: `${what}: ${progress}` } };
    }
    return {
        problems: [],
        next: { actor: 'cli', description: 'Push the signed release tag, which publishes the release', command: releaseCommand(ctx, 'tag') }
    };
}
