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

import { Argument, Command, Option } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import {
    GLSPRepo,
    LOGGER,
    baseCommand,
    configureEnv,
    configureLogger,
    exec,
    execForeground,
    findPullRequest,
    getCommitVerification,
    getRemoteTag,
    releaseExists
} from '../../util';
import { getChangeLogChanges } from './common';
import { prepareRelease } from './prepare';
import { ReleaseCheck, checkRelease, printChecks } from './release-checks';
import {
    ReleaseRepo,
    ReleaseStatus,
    getReleaseStatus,
    isDevelopmentVersion,
    nextDevelopmentVersion,
    openReleaseRepo,
    refreshReleaseRepo,
    releaseCommand
} from './release-state';

export type ReleaseVersionType = 'major' | 'minor' | 'patch' | 'custom';

export interface ReleaseTiming {
    /** How long to wait for the release to make progress (CI, review, publishing) */
    timeoutMs: number;
    pollIntervalMs: number;
}

const DEFAULT_TIMING: ReleaseTiming = { timeoutMs: 60 * 60_000, pollIntervalMs: 30_000 };

interface CommonCmdOptions {
    repo: GLSPRepo;
    owner: string;
    workdir?: string;
    verbose: boolean;
}

function releaseStepCommand(name: string, description: string): Command {
    return baseCommand()
        .name(name)
        .description(description)
        .addOption(new Option('--repo <repo>', 'The GLSP repository to release').choices(GLSPRepo.choices).makeOptionMandatory())
        .option('--owner <owner>', 'GitHub owner of the repository (e.g. a fork for a test release)', 'eclipse-glsp')
        .option('--workdir <dir>', 'Directory for the release clones (default: ~/.cache/glsp-releng/<owner>)')
        .option('-v, --verbose', 'Enable verbose (debug) log output', false);
}

function versionArguments(cmd: Command): Command {
    return cmd
        .addArgument(new Argument('<versionType>', 'The version type').choices(['major', 'minor', 'patch', 'custom']))
        .argument('[customVersion]', 'Custom version number. Required if the version type is "custom"');
}

function parseTimeout(timeout: string): Partial<ReleaseTiming> {
    const minutes = Number.parseInt(timeout, 10);
    if (Number.isNaN(minutes) || minutes <= 0) {
        throw new Error(`Invalid timeout: ${timeout}`);
    }
    return { timeoutMs: minutes * 60_000 };
}

const StatusCommand = releaseStepCommand('status', 'Show the phase of the release and what has to happen next')
    .option('--json', 'Print the status as JSON', false)
    .option('--wait', 'Wait until the phase, the next actor or the problems change; exit code 2 on timeout', false)
    .option('--timeout <minutes>', 'Timeout of --wait in minutes', '60')
    .action(async (options: CommonCmdOptions & { json: boolean; wait: boolean; timeout: string }) => {
        configureEnv(options);
        if (options.json) {
            configureLogger('warn');
        }
        const ctx = openReleaseRepo(options);
        const status = options.wait
            ? await waitForChange(ctx, { ...DEFAULT_TIMING, ...parseTimeout(options.timeout) }, !options.json)
            : await getReleaseStatus(ctx);
        if (options.json) {
            console.log(JSON.stringify(status ?? (await getReleaseStatus(ctx)), undefined, 2));
        } else if (status) {
            printStatus(status);
        }
        if (!status) {
            process.exitCode = 2;
        }
    });

const CheckCommand = versionArguments(releaseStepCommand('check', 'Check the preconditions of a release without changing anything'))
    .option('--json', 'Print the checks as JSON', false)
    .action(async (versionType: ReleaseVersionType, customVersion: string | undefined, options: CommonCmdOptions & { json: boolean }) => {
        configureEnv(options);
        if (options.json) {
            configureLogger('warn');
        }
        const ctx = openReleaseRepo(options);
        const { version, checks } = await checkStep(ctx, versionType, customVersion);
        if (options.json) {
            console.log(JSON.stringify({ version, checks }, undefined, 2));
        } else {
            LOGGER.info(`Preconditions of releasing ${ctx.slug} ${version}:`);
            printChecks(checks);
        }
        if (checks.some(check => check.result === 'fail')) {
            process.exitCode = 1;
        }
    });

const PrepareCommand = versionArguments(
    releaseStepCommand('prepare', 'Check the preconditions, then open the release PR (version bump and dated changelog)')
)
    .option('--dry-run', 'Commit the release locally, but do not push or open the PR', false)
    .action(async (versionType: ReleaseVersionType, customVersion: string | undefined, options: CommonCmdOptions & { dryRun: boolean }) => {
        configureEnv(options);
        const ctx = openReleaseRepo(options);
        await prepareStep(ctx, versionType, customVersion, { verbose: options.verbose, dryRun: options.dryRun });
    });

const TagCommand = releaseStepCommand(
    'tag',
    'Once the release PR is merged and CI passed on its merge commit: push the signed tag, which publishes the release, and create the GitHub release'
)
    .option('--draft', 'Create the GitHub release as a draft', false)
    .option('--dry-run', 'Sign the tag locally and print the release notes, but push nothing', false)
    .action(async (options: CommonCmdOptions & { draft: boolean; dryRun: boolean }) => {
        configureEnv(options);
        await tagStep(openReleaseRepo(options), { draft: options.draft, dryRun: options.dryRun });
    });

const NextCommand = releaseStepCommand(
    'next',
    'Once the release is published: open the PR that switches the default branch to the next development version'
)
    .option('--dry-run', 'Commit the version switch locally, but do not push or open the PR', false)
    .action(async (options: CommonCmdOptions & { dryRun: boolean }) => {
        configureEnv(options);
        await nextStep(openReleaseRepo(options), { verbose: options.verbose, dryRun: options.dryRun });
    });

const RunCommand = releaseStepCommand(
    'run',
    'Run all release steps and wait in between: prepare, review gate, tag, publishing, next. Without a version type, continue the release in progress.'
)
    .addArgument(
        new Argument('[versionType]', 'The version type (omit to continue the release in progress)').choices([
            'major',
            'minor',
            'patch',
            'custom'
        ])
    )
    .argument('[customVersion]', 'Custom version number. Required if the version type is "custom"')
    .option('--draft', 'Create the GitHub release as a draft', false)
    .option('--timeout <minutes>', 'How long to wait for the release to make progress, in minutes', '60')
    .action(
        async (
            versionType: ReleaseVersionType | undefined,
            customVersion: string | undefined,
            options: CommonCmdOptions & { draft: boolean; timeout: string }
        ) => {
            configureEnv(options);
            await runRelease({ ...options, versionType, customVersion, timing: parseTimeout(options.timeout) });
        }
    );

export const ReleaseCommand = baseCommand()
    .name('release')
    .description(
        'Release a GLSP repository in steps: check, prepare, tag and next, with status to see what happens next, or all of them with run'
    )
    .addCommand(StatusCommand)
    .addCommand(CheckCommand)
    .addCommand(PrepareCommand)
    .addCommand(TagCommand)
    .addCommand(NextCommand)
    .addCommand(RunCommand);

/** Derives the version to release from the development version on the default branch. */
export function deriveReleaseVersion(currentVersion: string, versionType: ReleaseVersionType, customVersion?: string): string {
    if (!isDevelopmentVersion(currentVersion)) {
        throw new Error(`The default branch is on the release version ${currentVersion}, not on a development version.`);
    }
    let version: string | null;
    if (versionType === 'custom') {
        if (!customVersion || !semver.valid(customVersion)) {
            throw new Error(`A valid custom version is required for the version type "custom" (got: ${customVersion})`);
        }
        version = customVersion;
    } else {
        version = semver.inc(currentVersion, versionType);
    }
    // the publishing workflows only accept final release tags v<major>.<minor>.<patch>
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`Only final releases (<major>.<minor>.<patch>) are supported, not ${version ?? currentVersion}.`);
    }
    return version;
}

export async function checkStep(
    ctx: ReleaseRepo,
    versionType: ReleaseVersionType,
    customVersion?: string
): Promise<{ version: string; status: ReleaseStatus; checks: ReleaseCheck[] }> {
    const status = await getReleaseStatus(ctx);
    const version = status.version ?? deriveReleaseVersion(status.branchVersion, versionType, customVersion);
    return { version, status, checks: await checkRelease(ctx, version, status) };
}

export interface StepOptions {
    verbose?: boolean;
    /** Do the local work only: no push, no PR, no tag on GitHub, no GitHub release */
    dryRun?: boolean;
}

export async function prepareStep(
    ctx: ReleaseRepo,
    versionType: ReleaseVersionType,
    customVersion?: string,
    { verbose = false, dryRun = false }: StepOptions = {}
): Promise<void> {
    LOGGER.label(`Preconditions of the release of ${ctx.slug}`);
    const { version, checks } = await checkStep(ctx, versionType, customVersion);
    printChecks(checks);
    if (checks.some(check => check.result === 'fail')) {
        throw new Error(`The preconditions of releasing ${version} are not met.`);
    }
    LOGGER.label(`Release PR of ${ctx.slug} ${version}`);
    await inRepoDir(ctx, () =>
        prepareRelease({ repo: ctx.repo, repoDir: ctx.repoDir, version, versionType, verbose, push: !dryRun, draft: false, check: false })
    );
    if (dryRun) {
        LOGGER.info(`Dry run: committed the release to the local branch release-v${version} in ${ctx.repoDir}. Nothing was pushed.`);
        return;
    }
    const pr = findPullRequest(ctx.slug, `release-v${version}`);
    LOGGER.info(
        `Opened the release PR ${pr?.url ?? `from release-v${version}`}. Next: wait for its CI, then a committer reviews and squash merges it.`
    );
}

export async function tagStep(ctx: ReleaseRepo, { draft = false, dryRun = false }: StepOptions & { draft?: boolean } = {}): Promise<void> {
    const status = await getReleaseStatus(ctx);
    const pushTag = status.phase === 'merged' && status.next.actor === 'cli';
    const createRelease = pushTag || (status.phase === 'tagged' && status.next.actor === 'cli');
    if (!createRelease) {
        throw new Error(`Nothing to tag: the release is in phase '${status.phase}'. ${describeNext(status)}`);
    }
    const version = status.version!;
    const sha = status.releaseCommit!;
    if (pushTag) {
        LOGGER.label(`Tag ${ctx.slug} v${version}`);
        validateReleaseCommit({ repo: ctx.repo, repoDir: ctx.repoDir, version }, sha);
        await pushReleaseTag(ctx, version, sha, dryRun);
    }
    createGitHubRelease(ctx, version, sha, draft, dryRun);
}

export async function nextStep(ctx: ReleaseRepo, { verbose = false, dryRun = false }: StepOptions = {}): Promise<void> {
    const status = await getReleaseStatus(ctx);
    if (status.phase !== 'published' || status.next.actor !== 'cli') {
        throw new Error(`Not ready to switch to the next version: the release is in phase '${status.phase}'. ${describeNext(status)}`);
    }
    const version = nextDevelopmentVersion(status.version!);
    if (ctx.repo === 'glsp-eclipse-integration') {
        // the next server build resolves the target platform from the server's nightly update site
        const nightly = `https://download.eclipse.org/glsp/server/p2/nightly/${version.split('.').slice(0, 2).join('.')}/p2.index`;
        if (!(await isReachable(nightly))) {
            throw new Error(
                `${nightly} does not exist yet. Merge the switch of glsp-server to ${version} and wait for its nightly deploy first.`
            );
        }
    }
    LOGGER.label(`Switch ${ctx.slug} to ${version}`);
    await inRepoDir(ctx, () =>
        prepareRelease({
            repo: ctx.repo,
            repoDir: ctx.repoDir,
            version,
            versionType: 'next',
            verbose,
            push: !dryRun,
            draft: false,
            check: false
        })
    );
    if (dryRun) {
        LOGGER.info(`Dry run: committed the switch to the local branch nightly-${version} in ${ctx.repoDir}. Nothing was pushed.`);
        return;
    }
    const pr = findPullRequest(ctx.slug, `nightly-${version}`);
    LOGGER.info(`Opened ${pr?.url ?? `the PR from nightly-${version}`}. Merge it to resume the nightly builds.`);
}

export interface RunOptions {
    repo: GLSPRepo;
    owner: string;
    workdir?: string;
    versionType?: ReleaseVersionType;
    customVersion?: string;
    draft: boolean;
    verbose: boolean;
    timing?: Partial<ReleaseTiming>;
}

/**
 * Runs the release steps in order and waits for CI, the review and publishing in between. Failures that are
 * fixed on GitHub do not end the run. All state lives on GitHub, so a later run continues where this one stopped.
 */
export async function runRelease(options: RunOptions): Promise<void> {
    const timing = { ...DEFAULT_TIMING, ...options.timing };
    const ctx = openReleaseRepo(options);
    try {
        const initial = await getReleaseStatus(ctx);
        if (initial.phase === 'idle') {
            if (!options.versionType) {
                throw new Error(`No release of ${ctx.slug} is in progress. Pass a version type to start one.`);
            }
            await prepareStep(ctx, options.versionType, options.customVersion, { verbose: options.verbose });
        } else if (options.versionType) {
            LOGGER.info(`Continuing the release of ${initial.version} that is in progress.`);
        }
        for (;;) {
            const status = await waitForAction(ctx, timing, s => s.next.actor === 'cli' || s.phase === 'published', true);
            if (!status) {
                throw new Error('Timed out waiting for the release to make progress.');
            }
            if (status.phase === 'merged' || status.phase === 'tagged') {
                await tagStep(ctx, { draft: options.draft });
            } else if (status.phase === 'published') {
                if (!status.nightlyPr) {
                    await nextStep(ctx, { verbose: options.verbose });
                }
                LOGGER.label(`Released ${ctx.slug} v${status.version}`);
                LOGGER.info(` - GitHub release: https://github.com/${ctx.slug}/releases/tag/v${status.version}`);
                return;
            } else {
                throw new Error(`Unexpected release phase '${status.phase}'. ${describeNext(status)}`);
            }
        }
    } catch (error) {
        LOGGER.info(`Continue the release with: ${releaseCommand(ctx, 'run')}`);
        throw error;
    }
}

/**
 * Polls the release status until `done` holds, and reports progress and problems on the way. The timeout
 * restarts whenever the release enters a new phase. Returns `undefined` on timeout.
 */
export async function waitForAction(
    ctx: ReleaseRepo,
    timing: ReleaseTiming,
    done: (status: ReleaseStatus) => boolean,
    report: boolean
): Promise<ReleaseStatus | undefined> {
    let deadline = Date.now() + timing.timeoutMs;
    let lastPhase: string | undefined;
    let lastReport = '';
    for (;;) {
        refreshReleaseRepo(ctx);
        const status = await getReleaseStatus(ctx);
        if (done(status)) {
            return status;
        }
        if (lastPhase !== undefined && status.phase !== lastPhase) {
            deadline = Date.now() + timing.timeoutMs;
        }
        lastPhase = status.phase;
        const currentReport = JSON.stringify([status.phase, status.problems, status.next]);
        if (report && currentReport !== lastReport) {
            printStatus(status);
        }
        lastReport = currentReport;
        if (Date.now() >= deadline) {
            return undefined;
        }
        await new Promise(resolve => setTimeout(resolve, timing.pollIntervalMs));
    }
}

/** Waits until the phase, the next actor or the problems change; returns at once if a release command is due. */
export async function waitForChange(ctx: ReleaseRepo, timing: ReleaseTiming, report: boolean): Promise<ReleaseStatus | undefined> {
    const initial = await getReleaseStatus(ctx);
    if (initial.next.actor === 'cli') {
        return initial;
    }
    const key = (status: ReleaseStatus): string => JSON.stringify([status.phase, status.next.actor, status.problems]);
    return waitForAction(ctx, timing, status => key(status) !== key(initial), report);
}

function printStatus(status: ReleaseStatus): void {
    LOGGER.info(`${status.slug}: ${status.version ? `release ${status.version}, ` : ''}phase '${status.phase}'`);
    for (const problem of status.problems) {
        LOGGER.warn(` ✘ ${problem}`);
    }
    LOGGER.info(` → ${describeNext(status)}`);
}

function describeNext(status: ReleaseStatus): string {
    return status.next.command ? `${status.next.description}: ${status.next.command}` : status.next.description;
}

async function isReachable(url: string): Promise<boolean> {
    try {
        return (await fetch(url, { method: 'HEAD' })).ok;
    } catch {
        return false;
    }
}

async function inRepoDir<T>(ctx: ReleaseRepo, action: () => Promise<T>): Promise<T> {
    // `releng prepare` changes into the clone
    const cwd = process.cwd();
    try {
        return await action();
    } finally {
        process.chdir(cwd);
    }
}

/** Checks that the merge commit carries the release version and its dated changelog section. */
export function validateReleaseCommit(ctx: Pick<ReleaseRepo, 'repo' | 'repoDir'> & { version: string }, sha: string): void {
    exec(`git fetch origin ${sha}`, { cwd: ctx.repoDir, silent: true });
    const show = (file: string): string => exec(`git show ${sha}:${file}`, { cwd: ctx.repoDir, silent: true });
    const versionFiles: Record<GLSPRepo, string[]> = {
        'glsp-core': ['package.json'],
        'glsp-theia-integration': ['package.json'],
        'glsp-vscode-integration': ['package.json'],
        'glsp-server': ['pom.xml'],
        'glsp-eclipse-integration': ['server/pom.xml', 'client/package.json']
    };
    for (const file of versionFiles[ctx.repo]) {
        const content = show(file);
        const actual = file.endsWith('.json') ? JSON.parse(content).version : content.match(/<version>(.*?)<\/version>/)?.[1];
        if (actual !== ctx.version) {
            throw new Error(`The release commit ${sha} has version ${actual} in ${file}, expected ${ctx.version}.`);
        }
    }
    const escaped = ctx.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^## \\[v${escaped}`, 'm').test(show('CHANGELOG.md'))) {
        throw new Error(`The CHANGELOG.md of the release commit ${sha} has no section for v${ctx.version}.`);
    }
}

async function pushReleaseTag(ctx: ReleaseRepo, version: string, sha: string, dryRun: boolean): Promise<void> {
    const tag = `v${version}`;
    const commitVerification = getCommitVerification(ctx.slug, sha);
    if (!commitVerification.verified) {
        LOGGER.warn(`The release commit ${sha} is not verified on GitHub (${commitVerification.reason}). Prefer squash merges.`);
    }
    try {
        exec(`git tag -d ${tag}`, { cwd: ctx.repoDir, silent: true });
    } catch {
        // no leftover local tag from an earlier run
    }
    await execForeground(`git tag -s ${tag} -m "Release ${tag}" ${sha}`, { cwd: ctx.repoDir });
    if (dryRun) {
        exec(`git tag -d ${tag}`, { cwd: ctx.repoDir, silent: true });
        LOGGER.info(`Dry run: created the signed tag ${tag} on ${sha} locally and deleted it again. Nothing was pushed.`);
        return;
    }
    exec(`git push origin ${tag}`, { cwd: ctx.repoDir, silent: true });
    LOGGER.info(`Pushed the signed tag ${tag}, which starts the publishing workflows`);

    const pushed = getRemoteTag(ctx.slug, tag);
    if (!pushed?.verification.verified) {
        exec(`git push origin --delete ${tag}`, { cwd: ctx.repoDir, silent: true });
        throw new Error(
            `GitHub does not show ${tag} as verified (${pushed?.verification.reason ?? 'tag not found'}). ` +
                'Add your signing key to your GitHub account as a signing key. ' +
                'The publishing workflows reject unverified tags, so nothing was published, and the tag was deleted again.'
        );
    }
}

function createGitHubRelease(ctx: ReleaseRepo, version: string, sha: string, draft: boolean, dryRun: boolean): void {
    const tag = `v${version}`;
    if (dryRun) {
        const changelog = exec(`git show ${sha}:CHANGELOG.md`, { cwd: ctx.repoDir, silent: true });
        LOGGER.info(`Dry run: the GitHub release ${tag} would get these notes:\n`);
        LOGGER.info(getChangeLogChanges({ repoDir: ctx.repoDir, version, repo: ctx.repo }, changelog));
        return;
    }
    if (releaseExists(ctx.slug, tag)) {
        LOGGER.info(`Skipping GitHub release: ${tag} already has one`);
        return;
    }
    const changelog = exec(`git show ${sha}:CHANGELOG.md`, { cwd: ctx.repoDir, silent: true });
    const notesFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'glsp-release-notes-')), `${tag}.md`);
    fs.writeFileSync(notesFile, getChangeLogChanges({ repoDir: ctx.repoDir, version, repo: ctx.repo }, changelog));
    exec(
        `gh release create ${tag} --repo ${ctx.slug} --verify-tag --title "${tag} Release" --notes-file ${notesFile}${draft ? ' --draft' : ''}`,
        {
            silent: true
        }
    );
    fs.rmSync(path.dirname(notesFile), { recursive: true, force: true });
    LOGGER.info(`Created the GitHub release ${tag}${draft ? ' (draft)' : ''}`);
}
