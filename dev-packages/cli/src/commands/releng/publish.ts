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

import { Argument } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
    LOGGER,
    PackageHelper,
    baseCommand,
    execAsync,
    getChangedFilesSince,
    getWorkspacePackages,
    isAncestorCommit,
    validateGitDirectory
} from '../../util';
import {
    CanaryVersion,
    configureEnv,
    deriveCanaryVersion,
    getVersionFromPackage,
    isNextVersion,
    npmDistTagVersion,
    npmVersionExists
} from './common';

export type PublishDistTag = 'next' | 'latest';

/** Default baseline for affected-only publishing: the changes introduced by the last commit. */
const DEFAULT_BASELINE = 'HEAD^';

/** Repo-global build config that shapes the compiled output of all packages; a change forces a full publish. */
const FULL_PUBLISH_PATHS = ['tsconfig.json'];

export interface PublishCmdOptions {
    verbose: boolean;
    repoDir: string;
    dryRun: boolean;
    registry?: string;
    interactive?: boolean;
    since?: string;
    full?: boolean;
}

export const PublishCommand = baseCommand()
    .name('publish')
    .description('Publish the affected workspace packages of a GLSP repository via `pnpm publish`')
    .addArgument(new Argument('<distTag>', 'The npm dist-tag to publish under').choices(['next', 'latest']))
    .option('-v, --verbose', 'Enable verbose (debug) log output', false)
    .option('-r, --repoDir <repoDir>', 'Path to the component repository', validateGitDirectory, process.cwd())
    .option('--dry-run', 'Derive versions and run `pnpm publish` in dry-run mode without applying changes', false)
    .option('--registry <url>', 'Publish to a custom npm registry (e.g. a local verdaccio for testing)')
    .option(
        '--interactive',
        'Bump versions but do not publish; print the `pnpm publish` command to run manually in an interactive shell (e.g. for npm 2FA/OTP prompts)',
        false
    )
    .option('--since <ref>', "Baseline for affected-only 'next' publishing (default: HEAD^, i.e. the changes of the last commit)")
    .option('--full', "Publish all packages, ignoring the affected-only baseline ('next' only)", false)
    .action((distTag: PublishDistTag, cmdOptions: PublishCmdOptions) => {
        configureEnv(cmdOptions);
        return publish(distTag, cmdOptions);
    });

/**
 * Publishes the (public) workspace packages of a GLSP repository via `pnpm publish -r`; npm
 * provenance/trusted publishing (configured via environment) is preserved.
 * - `next`: applies a canary version (`<root-version>.<commit-count>`) and publishes it under the
 *    `next` dist-tag. Only the packages affected by the last commit (or the changes since `--since`)
 *    are published (see {@link computePublishSet}); their `workspace:` ranges are rewritten to
 *    exact versions that are guaranteed to exist on npm (see {@link applyVersions}).
 * - `latest`: publishes the current package versions under the `latest` dist-tag (`workspace:` ranges
 *    are rewritten to exact versions by pnpm). Already published versions are skipped.
 */
export async function publish(distTag: PublishDistTag, options: PublishCmdOptions): Promise<void> {
    LOGGER.info(`Publish workspace packages of '${options.repoDir}' with dist-tag '${distTag}'`);
    if (distTag === 'next') {
        return publishNext(options);
    }
    if (options.since || options.full) {
        throw new Error("The --since and --full options are only supported for 'next' publishing.");
    }
    return publishLatest(options);
}

async function publishNext(options: PublishCmdOptions): Promise<void> {
    const canary = deriveCanaryVersion(options.repoDir);
    if (!isNextVersion(canary.base)) {
        throw new Error(`The root package version '${canary.base}' is not a next version. Cannot publish a 'next' canary release.`);
    }
    const countedFrom = canary.lastTag ?? 'the root commit';
    LOGGER.info(`Applying canary version ${canary.version} (base: ${canary.base}, ${canary.commitCount} commits since ${countedFrom})`);

    const packages = getWorkspacePackages(options.repoDir);
    const publishSet = computePublishSet(packages, options);
    let publishNames: string[] | undefined;
    let pinnedVersions: Map<string, string> | undefined;
    if (publishSet) {
        publishNames = packages.filter(pkg => !pkg.content.private && publishSet.has(pkg.name)).map(pkg => pkg.name);
        if (publishNames.length === 0) {
            LOGGER.info('No public packages are affected by the changes since the publish baseline. Nothing to publish.');
            return;
        }
        pinnedVersions = resolvePinnedVersions(packages, publishSet, options);
        if (!pinnedVersions) {
            // an unaffected package was never published -> an exact pin on it could not resolve, so publish everything
            publishNames = undefined;
        }
    }

    applyVersions(packages, canary, pinnedVersions, options);
    await pnpmPublish('next', options, publishNames);
}

/**
 * Resolves the currently published `next` version of every public package outside the publish set.
 * Published packages keep exact `workspace:` pins on these versions — and since a dependency change
 * always republishes all dependents (see {@link computePublishSet}), the pinned version is the same
 * one the other nightlies already reference, keeping the newest nightly set consistent.
 * @returns The versions by package name, or `undefined` if a package has no published `next`
 *  version yet (its pin could dangle, so a full publish is required).
 */
function resolvePinnedVersions(
    packages: PackageHelper[],
    publishSet: Set<string>,
    options: PublishCmdOptions
): Map<string, string> | undefined {
    const pinnedVersions = new Map<string, string>();
    const unaffected = packages.filter(pkg => !pkg.content.private && !publishSet.has(pkg.name));
    for (const pkg of unaffected) {
        const published = npmDistTagVersion(pkg.name, 'next', options.registry);
        if (!published) {
            LOGGER.warn(`No published 'next' version found for unaffected package ${pkg.name}. Publishing all packages.`);
            return undefined;
        }
        pinnedVersions.set(pkg.name, published);
    }
    return pinnedVersions;
}

/**
 * Applies the canary version to all workspace packages (the root keeps the plain base version),
 * except for the pinned unaffected packages, which keep their currently published `next` version
 * so that the exact `workspace:` pins of published packages always resolve on npm.
 */
function applyVersions(
    packages: PackageHelper[],
    canary: CanaryVersion,
    pinnedVersions: Map<string, string> | undefined,
    options: PublishCmdOptions
): void {
    packages.forEach(pkg => {
        const pinned = pinnedVersions?.get(pkg.name);
        const version = pinned ?? canary.version;
        const detail = pinned ? ' (unaffected, pinned to the published next version)' : '';
        if (options.dryRun) {
            LOGGER.info(`[dry-run] Would set version of ${pkg.name} to ${version}${detail}`);
            return;
        }
        LOGGER.debug(`Set version of ${pkg.name} to ${version}${detail}`);
        pkg.content.version = version;
        pkg.write();
    });
}

/** The workspace dependency names (`workspace:` ranges across all dependency sections) of the given package. */
function workspaceDependencies(pkg: PackageHelper): string[] {
    return [pkg.content.dependencies, pkg.content.devDependencies, pkg.content.peerDependencies].flatMap(deps =>
        Object.entries(deps ?? {})
            .filter(([, range]) => range.startsWith('workspace:'))
            .map(([name]) => name)
    );
}

/**
 * Determines the packages affected since the publish baseline: packages with changed files in their
 * directory, plus all their transitive dependents in the workspace dependency graph (dependents are
 * republished so the newest nightlies always form a consistent, exact-pinned set).
 * @returns The names of the affected packages, or `undefined` if a full publish should be performed
 *  (`--full`, no usable baseline, or a repo-global build config changed).
 */
function computePublishSet(packages: PackageHelper[], options: PublishCmdOptions): Set<string> | undefined {
    if (options.full) {
        LOGGER.info('Publishing all packages (--full)');
        return undefined;
    }
    const baseline = options.since ?? DEFAULT_BASELINE;
    if (!isAncestorCommit(baseline, options.repoDir)) {
        LOGGER.warn(`Cannot resolve the baseline '${baseline}'. Publishing all packages.`);
        return undefined;
    }

    const changedFiles = getChangedFilesSince(baseline, options.repoDir);
    const globalChange = changedFiles.find(file => FULL_PUBLISH_PATHS.includes(file));
    if (globalChange) {
        LOGGER.info(`'${globalChange}' changed since '${baseline}' and affects the build output of all packages. Publishing all packages.`);
        return undefined;
    }

    const affected = new Set(
        packages
            .filter(pkg => {
                const location = `${path.relative(options.repoDir, pkg.location).replace(/\\/g, '/')}/`;
                return changedFiles.some(file => file.startsWith(location));
            })
            .map(pkg => pkg.name)
    );
    // transitive dependents of a changed package are republished so the newest nightlies form a consistent set
    let changed = true;
    while (changed) {
        changed = false;
        for (const pkg of packages) {
            if (!affected.has(pkg.name) && workspaceDependencies(pkg).some(dep => affected.has(dep))) {
                affected.add(pkg.name);
                changed = true;
            }
        }
    }

    if (affected.size > 0) {
        LOGGER.info(`${affected.size} of ${packages.length} packages affected since '${baseline}': ${[...affected].join(', ')}`);
    }
    return affected;
}

async function publishLatest(options: PublishCmdOptions): Promise<void> {
    const version = getVersionFromPackage(options.repoDir);
    if (isNextVersion(version)) {
        throw new Error(`The root package version '${version}' is a next version. Refusing to publish under the 'latest' dist-tag.`);
    }

    const publicPackages = getWorkspacePackages(options.repoDir).filter(pkg => !pkg.content.private);
    const unpublished = publicPackages.filter(pkg => {
        if (npmVersionExists(pkg.name, pkg.content.version)) {
            LOGGER.info(`Skipping ${pkg.name}@${pkg.content.version} - already published`);
            return false;
        }
        return true;
    });
    if (unpublished.length === 0) {
        LOGGER.warn('All package versions are already published. Nothing to publish.');
        return;
    }
    LOGGER.info(`Publishing ${unpublished.length} of ${publicPackages.length} public packages`);

    await pnpmPublish('latest', options);
}

async function pnpmPublish(distTag: PublishDistTag, options: PublishCmdOptions, publishNames?: string[]): Promise<void> {
    let cmd = `pnpm publish -r --tag ${distTag} --no-git-checks`;
    if (publishNames) {
        cmd += publishNames.map(name => ` --filter ${name}`).join('');
    }
    if (options.dryRun) {
        cmd += ' --dry-run';
    }
    if (options.registry) {
        cmd += ` --registry ${options.registry}`;
    }
    if (options.interactive) {
        // pnpm can't prompt for an OTP from the spawned (non-TTY) child process, so hand the command to the user.
        LOGGER.info('Versions bumped. Run the following command in an interactive shell to publish:');
        LOGGER.info(`\n  ${cmd}\n`);
        return;
    }
    cmd += ' --report-summary';
    await execAsync(cmd, { cwd: options.repoDir, silent: false, errorMsg: 'pnpm publish failed' });
    reportPublishSummary(options);
}

function reportPublishSummary(options: PublishCmdOptions): void {
    const summaryPath = path.resolve(options.repoDir, 'pnpm-publish-summary.json');
    if (!fs.existsSync(summaryPath)) {
        LOGGER.warn('No pnpm publish summary found.');
        return;
    }
    try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as {
            publishedPackages?: { name: string; version: string }[];
        };
        const published = summary.publishedPackages ?? [];
        if (published.length === 0) {
            LOGGER.warn('No packages were published.');
        } else {
            LOGGER.info(`Published ${published.length} packages:`);
            published.forEach(pkg => LOGGER.info(` - ${pkg.name}@${pkg.version}`));
        }
    } finally {
        fs.rmSync(summaryPath, { force: true });
    }
}
