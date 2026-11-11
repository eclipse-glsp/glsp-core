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

export interface PullRequestInfo {
    number: number;
    url: string;
    state: 'OPEN' | 'CLOSED' | 'MERGED';
    mergeCommit?: { oid: string } | null;
}

/** Returns the merged PR of the given head branch, if there is one. */
export function findMergedPullRequest(slug: string, head: string): PullRequestInfo | undefined {
    return ghJson<PullRequestInfo[]>(`pr list --repo ${slug} --head ${head} --state merged --json number,url,state,mergeCommit`)[0];
}

export interface Verification {
    verified: boolean;
    reason: string;
}

export interface RemoteTag {
    /** The commit the tag points at */
    commit: string;
    verification: Verification;
}

/** Returns the remote tag, or `undefined` if it does not exist. Throws if the lookup itself fails. */
export function getRemoteTag(slug: string, tag: string): RemoteTag | undefined {
    let ref: { object: { sha: string; type: string } };
    try {
        ref = ghJson(`api repos/${slug}/git/ref/tags/${tag}`);
    } catch (error) {
        if (error instanceof Error && error.message.includes('HTTP 404')) {
            return undefined;
        }
        throw error;
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
