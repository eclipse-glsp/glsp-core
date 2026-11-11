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
import {
    GLSPRepo,
    LOGGER,
    baseCommand,
    exec,
    execForeground,
    findMergedPullRequest,
    getGitHubSlug,
    getRemoteTag,
    releaseExists,
    validateGitDirectory
} from '../../util';
import { checkGHCli, configureEnv, getChangeLogChanges } from './common';

interface TagCmdOptions {
    repoDir: string;
    draft: boolean;
    dryRun: boolean;
    verbose: boolean;
}

export const TagCommand = baseCommand()
    .name('tag')
    .description(
        'Push the signed release tag v<version> on the merge commit of the release PR, which starts publishing, and create the GitHub release'
    )
    .argument('<version>', 'The released version, e.g. 2.9.0')
    .option('-v, --verbose', 'Enable verbose (debug) log output', false)
    .option('-r, --repoDir <repoDir>', 'Path to the component repository', validateGitDirectory, process.cwd())
    .option('-d, --draft', 'Create the GitHub release as a draft', false)
    .option('--dry-run', 'Sign the tag locally and print the release notes; push and create nothing', false)
    .action((version: string, options: TagCmdOptions) => {
        configureEnv(options);
        return tagRelease({ ...options, version });
    });

export interface TagOptions {
    repoDir: string;
    version: string;
    draft?: boolean;
    dryRun?: boolean;
}

/** Tags the merge commit of `release-v<version>` and creates the GitHub release. Skips what already exists, so it can be rerun. */
export async function tagRelease({ repoDir, version, draft = false, dryRun = false }: TagOptions): Promise<void> {
    // matches the tags publish.yml accepts; the version also ends up in shell commands
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`Expected a release version like 2.9.0, got '${version}'.`);
    }
    checkGHCli();
    const slug = getGitHubSlug(repoDir);
    const repo = slug.split('/')[1];
    if (!GLSPRepo.is(repo)) {
        throw new Error(`${slug} is not a GLSP repository.`);
    }
    const tag = `v${version}`;
    const pr = findMergedPullRequest(slug, `release-v${version}`);
    if (!pr?.mergeCommit?.oid) {
        throw new Error(`${slug} has no merged release PR from release-v${version}.`);
    }
    const sha = pr.mergeCommit.oid;
    exec(`git fetch origin ${sha}`, { cwd: repoDir, silent: true });
    LOGGER.info(`Release commit of ${tag}: ${sha} (${pr.url})`);
    // before the tag, so a broken changelog stops the release before anything is published
    const notes = getChangeLogChanges({ repoDir, version, repo }, exec(`git show ${sha}:CHANGELOG.md`, { cwd: repoDir, silent: true }));

    const remoteTag = getRemoteTag(slug, tag);
    if (!remoteTag) {
        await pushTag(repoDir, slug, tag, sha, dryRun);
    } else if (remoteTag.commit !== sha || !remoteTag.verification.verified) {
        throw new Error(
            `${tag} already exists on ${remoteTag.commit} (verified: ${remoteTag.verification.verified}, ${remoteTag.verification.reason}). ` +
                `The publishing workflows only accept a verified tag on ${sha}: delete it with 'git push origin --delete ${tag}' and rerun.`
        );
    } else {
        LOGGER.info(`Skipping the tag: ${tag} is already pushed and verified`);
    }

    if (dryRun) {
        LOGGER.info(`Dry run: the GitHub release ${tag} would get these notes:\n\n${notes}`);
    } else if (releaseExists(slug, tag)) {
        LOGGER.info(`Skipping the GitHub release: ${tag} already has one`);
    } else {
        const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glsp-release-notes-'));
        const notesFile = path.join(notesDir, `${tag}.md`);
        fs.writeFileSync(notesFile, notes);
        try {
            exec(
                `gh release create ${tag} --repo ${slug} --verify-tag --title "${tag} Release" --notes-file ${notesFile}${draft ? ' --draft' : ''}`,
                { silent: true }
            );
        } finally {
            fs.rmSync(notesDir, { recursive: true, force: true });
        }
        LOGGER.info(`Created the GitHub release ${tag}${draft ? ' (draft)' : ''}`);
    }
}

async function pushTag(repoDir: string, slug: string, tag: string, sha: string, dryRun: boolean): Promise<void> {
    try {
        exec(`git tag -d ${tag}`, { cwd: repoDir, silent: true });
    } catch {
        // no leftover local tag
    }
    // in the foreground, so gpg or ssh can prompt for the passphrase
    await execForeground(`git tag -s ${tag} -m "Release ${tag}" ${sha}`, { cwd: repoDir });
    if (dryRun) {
        exec(`git tag -d ${tag}`, { cwd: repoDir, silent: true });
        LOGGER.info(`Dry run: signed ${tag} on ${sha} locally and deleted it again. Nothing was pushed.`);
        return;
    }
    exec(`git push origin ${tag}`, { cwd: repoDir, silent: true });
    const pushed = getRemoteTag(slug, tag);
    if (!pushed) {
        throw new Error(`Pushed ${tag}, but GitHub does not list it yet. Rerun to check its signature.`);
    }
    if (!pushed.verification.verified) {
        exec(`git push origin --delete ${tag}`, { cwd: repoDir, silent: true });
        throw new Error(
            `GitHub does not show ${tag} as verified (${pushed.verification.reason}), so the publishing workflows ` +
                'would reject it. The tag was deleted again. Add your signing key to your GitHub account as a signing key and rerun.'
        );
    }
    LOGGER.info(`Pushed the signed tag ${tag}, which starts the publishing workflows`);
}
