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
import { GLSPRepo, getWorkspacePackages } from '../../util';
import { isExistingMavenVersion, npmVersionExists } from './common';

/** Checks whether one part of a release is publicly available. */
export interface ReleaseProbe {
    label: string;
    isPublished(): Promise<boolean>;
}

export interface ReleaseTargets {
    /** Workflow files that publish the release when its tag is pushed */
    workflows: string[];
    probes: ReleaseProbe[];
}

export function getReleaseTargets(repo: GLSPRepo, repoDir: string, version: string): ReleaseTargets {
    switch (repo) {
        case 'glsp-core':
        case 'glsp-theia-integration':
        case 'glsp-vscode-integration':
            return { workflows: ['publish.yml'], probes: [npmProbe(repoDir, version)] };
        case 'glsp-eclipse-integration':
            return {
                workflows: ['publish.yml', 'release.yml'],
                probes: [npmProbe(path.join(repoDir, 'client'), version), p2Probe('ide', version)]
            };
        case 'glsp-server':
            return { workflows: ['release.yml'], probes: [mavenCentralProbe(version), p2Probe('server', version)] };
    }
}

function npmProbe(workspaceDir: string, version: string): ReleaseProbe {
    return {
        label: `npm packages @ ${version}`,
        isPublished: async () =>
            getWorkspacePackages(workspaceDir)
                .filter(pkg => !pkg.content.private)
                .every(pkg => npmVersionExists(pkg.name, version))
    };
}

export function p2Probe(site: 'server' | 'ide', version: string): ReleaseProbe {
    const url = `https://download.eclipse.org/glsp/${site}/p2/releases/${version}/p2.index`;
    return {
        label: `p2 update site ${url.replace('/p2.index', '')}`,
        isPublished: async () => {
            try {
                return (await fetch(url, { method: 'HEAD' })).ok;
            } catch {
                return false;
            }
        }
    };
}

function mavenCentralProbe(version: string): ReleaseProbe {
    return {
        label: `Maven Central org.eclipse.glsp.server @ ${version}`,
        isPublished: async () => {
            try {
                return isExistingMavenVersion('org.eclipse.glsp', 'org.eclipse.glsp.server', version);
            } catch {
                return false;
            }
        }
    };
}
