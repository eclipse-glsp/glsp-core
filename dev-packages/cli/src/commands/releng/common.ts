/********************************************************************************
 * Copyright (c) 2025-2026 EclipseSource and others.
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
import * as semver from 'semver';
import {
    GLSPRepo,
    LOGGER,
    checkGHCli,
    configureEnv,
    exec,
    getGLSPDependencies,
    isGithubCLIAuthenticated,
    readFile,
    readPackage
} from '../../util';

export interface RelengOptions {
    verbose: boolean;
    repoDir: string;
    version: string;
    versionType: VersionType;
    repo: GLSPRepo;
}

export type RelengCmdOptions = Omit<RelengOptions, 'version' | 'repo' | 'versionType'>;

// Versioning

export type VersionType = (typeof VersionType.choices)[number];
export namespace VersionType {
    export const choices = ['major', 'minor', 'patch', 'custom', 'next'] as const;

    export function validate(versionType: string, customVersion?: string): void {
        LOGGER.debug(`Validate version type: ${versionType} with custom version: ${customVersion}`);
        if (versionType === 'custom' && !customVersion) {
            throw new Error('Custom version must be provided if version type is "custom".');
        }

        if (versionType !== 'custom' && customVersion) {
            console.warn('Warning: Custom version will be ignored since version type is not "custom".');
        }
    }

    export function deriveVersion(options: Omit<RelengOptions, 'version'>, customVersion?: string): string {
        const { versionType } = options;
        validate(versionType, customVersion);
        LOGGER.debug(`Derive version for version type: ${versionType} with custom version: ${customVersion}`);
        if (versionType === 'custom') {
            if (GLSPRepo.isNpmRepo(options.repo) && !semver.valid(customVersion)) {
                throw new Error(`Not a valid custom version: ${customVersion}`);
            }
            return customVersion!;
        }

        const currentVersion = getLocalVersion(options.repoDir, options.repo);
        return toNewVersion(currentVersion, versionType);
    }
}

export function npmVersionExists(packageName: string, version: string): boolean {
    try {
        const result = exec(`npm view ${packageName}@${version} version`, { silent: true }).trim();
        return result.trim() === version;
    } catch {
        return false;
    }
}

/**
 * Returns the version currently published under the given dist-tag, or `undefined` if the package
 * (or the dist-tag) does not exist. Lookup failures (e.g. network errors) are also treated as
 * "not published".
 * @param packageName The npm package name
 * @param distTag The dist-tag to resolve (e.g. `next`)
 * @param registry Optional custom registry URL (e.g. a local verdaccio for testing)
 */
export function npmDistTagVersion(packageName: string, distTag: string, registry?: string): string | undefined {
    const registryArg = registry ? ` --registry ${registry}` : '';
    try {
        const result = exec(`npm view ${packageName} dist-tags.${distTag}${registryArg}`, { silent: true }).trim();
        return result.length > 0 ? result : undefined;
    } catch {
        return undefined;
    }
}

export function asMvnVersion(version: string): string {
    LOGGER.debug(`Convert to maven conform version: ${version}`);
    const mavenVersion = isNextVersion(version) ? version.replace('-next', '-SNAPSHOT') : version;
    LOGGER.debug(`Maven version :${mavenVersion}`);
    return mavenVersion;
}

export function checkIfMavenVersionExists(groupId: string, artifactId: string, newVersion: string): void {
    LOGGER.debug('Check if maven version exists');
    if (isExistingMavenVersion(groupId, artifactId, newVersion)) {
        throw new Error(`Version '${newVersion} is already present on maven central!`);
    }
    LOGGER.debug(`Version '${newVersion}' does not exist on maven central. Continue with release`);
}

export function isExistingMavenVersion(groupId: string, artifactId: string, version: string): boolean {
    const metadata = exec(`wget -q -O - https://repo1.maven.org/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/maven-metadata.xml`, {
        silent: true
    });
    return metadata.includes(`<version>${version}</version>`);
}

export function getLocalVersion(repoDir: string, repo: GLSPRepo): string {
    if (repo === 'glsp-server') {
        return getVersionFromPom(repoDir);
    } else if (repo === 'glsp-eclipse-integration') {
        return getVersionFromPom(path.resolve(repoDir, 'server'));
    } else {
        return getVersionFromPackage(repoDir);
    }
}

export function getVersionFromPom(repoDir: string): string {
    const pom = readFile(path.resolve(repoDir, 'pom.xml'));
    const match = pom.match(/<version>(.*?)<\/version>/);
    if (!match) {
        throw new Error(`Could not find version in pom.xml of ${repoDir}`);
    }
    return match[1];
}

export function getVersionFromPackage(repoDir: string): string {
    // derive version from package.json of the root package
    const rootPkg = readPackage(path.resolve(repoDir, 'package.json'));
    const existingVersion = rootPkg.content.version;
    if (!existingVersion) {
        throw new Error(`No version found in package.json of ${repoDir}`);
    }
    return existingVersion;
}

function toNewVersion(version: string, versionType: Exclude<VersionType, 'custom'>): string {
    const newVersion =
        versionType === 'next'
            ? semver.inc(version, 'minor')?.concat('-next') //
            : semver.inc(version, versionType);
    if (!newVersion) {
        throw new Error(`Could not increment version: ${version} `);
    }
    return newVersion;
}

export function isNextVersion(version: string): boolean {
    return version.endsWith('-next') || version.endsWith('.SNAPSHOT');
}

export interface CanaryVersion {
    /** The base version from the root package.json, e.g. `2.8.0-next` */
    base: string;
    /** The most recent release tag (`v*`), or `undefined` if none is reachable from HEAD */
    lastTag?: string;
    /** The number of commits since {@link lastTag} (or since the root commit if no release tag exists) */
    commitCount: number;
    /** The derived canary version, e.g. `2.8.0-next.42` */
    version: string;
}

/**
 * Derives a canary version for `next` publishing (replacement for `lerna publish --canary`).
 * The version is the root package version suffixed with the number of commits since the last
 * release tag (`v*`), e.g. `2.8.0-next.42`. If no release tag is reachable from HEAD, all commits
 * are counted from the root commit instead. Requires the full git history (fetch-depth: 0 in CI).
 * @param repoDir The root path of the repository
 */
export function deriveCanaryVersion(repoDir: string): CanaryVersion {
    const base = getVersionFromPackage(repoDir);
    if (exec('git rev-parse --is-shallow-repository', { cwd: repoDir, silent: true }).trim() === 'true') {
        throw new Error(
            `Cannot derive a canary version in the shallow clone '${repoDir}'.` +
                ' Counting commits requires the full git history (fetch-depth: 0 in CI).'
        );
    }
    let lastTag: string | undefined;
    try {
        // only consider release tags so that moving marker tags (e.g. `published/next`) don't corrupt the commit count
        lastTag = exec("git describe --tags --abbrev=0 --match 'v[0-9]*'", { cwd: repoDir, silent: true }).trim();
    } catch {
        lastTag = undefined;
    }
    const countRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
    const commitCount = Number.parseInt(exec(`git rev-list --count ${countRange}`, { cwd: repoDir, silent: true }).trim(), 10);
    if (Number.isNaN(commitCount)) {
        throw new Error(`Could not determine the number of commits for '${countRange}' in '${repoDir}'.`);
    }
    return { base, lastTag, commitCount, version: `${base}.${commitCount}` };
}

export async function checkIfNpmVersionIsNew(pckgName: string, newVersion: string): Promise<void> {
    LOGGER.debug(`Check that the release version is new i.e. does not exist on npm: ${newVersion}`);

    const response = await fetch(`https://registry.npmjs.org/${pckgName}/${newVersion}`);
    const data = await response.json();
    if (typeof data === 'string' && data.includes('version not found:')) {
        LOGGER.debug(`Version '${newVersion}' does not exist on NPM.`);
        return;
    }
    throw new Error(`Version '${newVersion} is already present on NPM!}`);
}

/**
 * Returns the most recent release tag (excluding pre-releases and custom qualifier tags).
 * Only tags that start with 'v' followed by a semantic version (e.g. v1.0.0) are considered.
 * @param path The path to the git repository. If not provided, the current working directory is used.
 */
export function getLastReleaseTag(repoDir?: string): string | undefined {
    const tags = exec('git tag --list --sort=-v:refname', { cwd: repoDir }).split('\n');

    const lastTag = tags.find(tag => {
        if (!tag.startsWith('v')) {
            return false;
        }
        const version = tag.substring(1);
        return semver.valid(version) !== undefined && !semver.prerelease(version);
    });

    return lastTag;
}

export function getChangeLogChanges(options: Pick<RelengOptions, 'repoDir' | 'version' | 'repo'>): string {
    const version = options.version;
    const md = readFile('CHANGELOG.md');
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^## \\[v${escapedVersion}[^\\n]*\\n(?:^(?!## ).*\\n?)*`, 'gm');
    const match = md.match(regex);
    const previousTag = getLastReleaseTag(options.repoDir);
    if (!match) {
        throw new Error(`No changelog section found for version ${version}`);
    }
    // Remove header section and return only the content lines
    let content = match[0].trim().split('\n').splice(2).join('\n').trim();

    content = content.replace('###', '##'); // demote headings by one level
    if (previousTag) {
        content += `

**Full Changelog**: https://github.com/eclipse-glsp/${options.repo}/compare/${previousTag}...v${version}
`;
    }
    return content;
}

export { GLSPRepo, checkGHCli, configureEnv, getGLSPDependencies, isGithubCLIAuthenticated };
