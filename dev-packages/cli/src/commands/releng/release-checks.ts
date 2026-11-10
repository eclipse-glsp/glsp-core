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

import * as path from 'path';
import {
    GLSPRepo,
    LOGGER,
    exec,
    execForeground,
    getCommitChecks,
    getGLSPDependencies,
    getRemoteTag,
    getWorkspacePackages,
    hasPushAccess,
    readFile
} from '../../util';
import { getChangelogStatus } from './changelog';
import { npmVersionExists } from './common';
import { ReleaseRepo, ReleaseStatus } from './release-state';
import { getReleaseTargets, p2Probe } from './release-targets';

export type CheckResult = 'ok' | 'warn' | 'fail';

export interface ReleaseCheck {
    name: string;
    result: CheckResult;
    detail: string;
}

const REQUIRED_TOOLS: Record<GLSPRepo, string[]> = {
    'glsp-core': ['git', 'node', 'pnpm'],
    'glsp-theia-integration': ['git', 'node', 'pnpm', 'python3'],
    'glsp-vscode-integration': ['git', 'node', 'pnpm'],
    'glsp-server': ['git', 'mvn', 'java', 'wget'],
    'glsp-eclipse-integration': ['git', 'node', 'pnpm', 'mvn', 'java', 'wget']
};

/**
 * Checks the preconditions of releasing the given version: access, toolchain and signing, a clean start,
 * an unpublished version with published dependencies, green CI and an up-to-date changelog.
 */
export async function checkRelease(ctx: ReleaseRepo, version: string, status: ReleaseStatus): Promise<ReleaseCheck[]> {
    const checks: ReleaseCheck[] = [];
    const run = async (name: string, check: () => [CheckResult, string] | Promise<[CheckResult, string]>): Promise<void> => {
        try {
            const [result, detail] = await check();
            checks.push({ name, result, detail });
        } catch (error) {
            checks.push({ name, result: 'fail', detail: error instanceof Error ? error.message : String(error) });
        }
    };

    await run('push access', () => (hasPushAccess(ctx.slug) ? ['ok', ctx.slug] : ['fail', `You need push access to ${ctx.slug}`]));
    await run('toolchain', () => {
        const missing = REQUIRED_TOOLS[ctx.repo].filter(tool => !commandExists(tool));
        return missing.length === 0 ? ['ok', REQUIRED_TOOLS[ctx.repo].join(', ')] : ['fail', `Missing: ${missing.join(', ')}`];
    });
    await run('signing', async () => {
        await checkSigning(ctx.repoDir);
        return ['ok', 'git can sign the release tag'];
    });
    await run('no release in progress', () =>
        status.phase === 'idle'
            ? ['ok', `The default branch is on ${status.branchVersion}`]
            : ['fail', `The release of ${status.version} is in phase '${status.phase}'. ${status.next.description}`]
    );
    await run('version', async () => {
        if (getRemoteTag(ctx.slug, `v${version}`)) {
            return ['fail', `Tag v${version} already exists`];
        }
        const published = [];
        for (const probe of getReleaseTargets(ctx.repo, ctx.repoDir, version).probes) {
            if (await probe.isPublished()) {
                published.push(probe.label);
            }
        }
        return published.length === 0 ? ['ok', `${version} is not released yet`] : ['fail', `Already published: ${published.join(', ')}`];
    });
    await run('dependencies', () => checkDependencies(ctx, version));
    await run('CI', () => {
        const head = exec('git rev-parse HEAD', { cwd: ctx.repoDir, silent: true });
        const ci = getCommitChecks(ctx.slug, head, ctx.defaultBranch);
        if (ci.failed.length > 0) {
            return ['fail', `CI failed on ${head}: ${ci.failed.map(check => `${check.name} ${check.url ?? ''}`.trim()).join(', ')}`];
        }
        if (ci.total === 0 || ci.pending.length > 0) {
            return ['warn', `CI on ${head} has not finished yet (${ci.total - ci.pending.length}/${ci.total} done)`];
        }
        return ['ok', `All ${ci.total} workflow runs passed on ${head}`];
    });
    await run('changelog section', () => {
        const changelog = readFile(path.join(ctx.repoDir, 'CHANGELOG.md'));
        const section = getActiveSection(changelog, version);
        if (section === undefined) {
            return ['fail', `CHANGELOG.md has no '## v${version} - active' section`];
        }
        return /^\s*- /m.test(section) ? ['ok', `## v${version} - active`] : ['warn', `The section of v${version} has no entries`];
    });
    await run('changelog up to date', () => {
        const changelog = getChangelogStatus(ctx.repoDir);
        if (changelog.pending.length === 0) {
            return ['ok', `All commits since ${changelog.baseline.kind} ${changelog.baseline.ref.substring(0, 8)} are covered`];
        }
        const pending = changelog.pending.map(commit => `${commit.sha.substring(0, 8)} ${commit.subject}`).join('; ');
        return [
            'fail',
            `${changelog.pending.length} commit(s) have no changelog decision yet, run the generate-changelog skill: ${pending}`
        ];
    });
    return checks;
}

export function printChecks(checks: ReleaseCheck[]): void {
    const symbol: Record<CheckResult, string> = { ok: '✔', warn: '!', fail: '✘' };
    for (const check of checks) {
        const line = ` ${symbol[check.result]} ${check.name}${check.detail ? `: ${check.detail}` : ''}`;
        if (check.result === 'ok') {
            LOGGER.info(line);
        } else {
            LOGGER.warn(line);
        }
    }
}

/** Returns the body of the `## v<version> - active` section, or `undefined` if there is none. */
export function getActiveSection(changelog: string, version: string): string | undefined {
    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = changelog.match(new RegExp(`^## v${escaped} - active[^\\n]*\\n((?:(?!## [^#]).*(?:\\n|$))*)`, 'm'));
    return match?.[1];
}

export async function checkSigning(repoDir: string): Promise<void> {
    const emptyTree = exec('git hash-object -w -t tree /dev/null', { cwd: repoDir, silent: true });
    try {
        // runs in the foreground so that a passphrase prompt shows up now instead of at tag time
        await execForeground(`git commit-tree -S -m signing-check ${emptyTree} > /dev/null`, { cwd: repoDir });
    } catch {
        throw new Error(
            'Git cannot sign with your configuration, but the release tag must be signed. ' +
                'Configure user.signingkey (and gpg.format for SSH keys) and add the key to your GitHub account as a signing key.'
        );
    }
}

function commandExists(tool: string): boolean {
    try {
        exec(`which ${tool}`, { silent: true });
        return true;
    } catch {
        return false;
    }
}

async function checkDependencies(ctx: ReleaseRepo, version: string): Promise<[CheckResult, string]> {
    const missing: string[] = [];
    const npmWorkspace = GLSPRepo.isNpmRepo(ctx.repo)
        ? ctx.repoDir
        : ctx.repo === 'glsp-eclipse-integration'
          ? path.join(ctx.repoDir, 'client')
          : undefined;
    if (npmWorkspace) {
        const packages = getWorkspacePackages(npmWorkspace, true);
        const workspaceNames = new Set(packages.map(pkg => pkg.name));
        const deps = new Set(packages.flatMap(pkg => getGLSPDependencies(pkg)).filter(dep => !workspaceNames.has(dep)));
        missing.push(...[...deps].filter(dep => !npmVersionExists(dep, version)).map(dep => `${dep}@${version}`));
    }
    if (ctx.repo === 'glsp-eclipse-integration') {
        const server = p2Probe('server', version);
        if (!(await server.isPublished())) {
            missing.push(server.label);
        }
    }
    return missing.length === 0 ? ['ok', 'All GLSP dependencies are released'] : ['fail', `Not released yet: ${missing.join(', ')}`];
}
