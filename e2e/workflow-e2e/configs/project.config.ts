/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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

import { defineStandaloneIntegration, GLSPPlaywrightOptions } from '@eclipse-glsp/playwright';
import { PlaywrightTestOptions, PlaywrightWorkerArgs, Project, devices } from '@playwright/test';
import { GLSP_SERVER_TYPE_NODE } from '../src/server/server';
import { getUrl } from './env';

export type ProjectName = 'standalone' | 'standalone-browser';

const projectDevices = devices['Desktop Chrome'];

/**
 * The standalone GLSP-Client projects.
 */
export function buildProjects(
    activeProjects: ProjectName[]
): Project<PlaywrightTestOptions & GLSPPlaywrightOptions, PlaywrightWorkerArgs>[] {
    return activeProjects.map(name => ({
        name,
        testMatch: ['**/*.spec.js'],
        use: {
            ...projectDevices,
            integrationOptions: defineStandaloneIntegration({
                url: getUrl(name === 'standalone' ? 'STANDALONE_PORT' : 'STANDALONE_BROWSER_PORT', '/diagram.html')
            })
        }
    }));
}

/**
 * Projects requested on the command line, or every supported project when none was given.
 */
export function getActiveProjects(): ProjectName[] {
    const all: ProjectName[] = ['standalone', 'standalone-browser'];
    const requested = parseRequestedProjects();

    if (requested) {
        for (const project of requested) {
            if (!all.includes(project)) {
                throw new Error(`Unknown project: "${project}". Available: ${all.join(', ')}`);
            }
            if (!isProjectSupported(project)) {
                throw new Error(`Project "${project}" is not supported with server type "${process.env.GLSP_SERVER_TYPE}"`);
            }
        }
        return requested;
    }

    return all.filter(isProjectSupported);
}

function parseRequestedProjects(): ProjectName[] | undefined {
    const args = process.argv;
    const projects: ProjectName[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && i + 1 < args.length) {
            projects.push(args[i + 1] as ProjectName);
        } else if (args[i].startsWith('--project=')) {
            projects.push(args[i].slice('--project='.length) as ProjectName);
        }
    }
    return projects.length > 0 ? [...new Set(projects)] : undefined;
}

/**
 * The `standalone-browser` project runs the GLSP server compiled to a web worker, which only
 * exists for the Node server.
 */
function isProjectSupported(project: ProjectName): boolean {
    return !(project === 'standalone-browser' && process.env.GLSP_SERVER_TYPE !== GLSP_SERVER_TYPE_NODE);
}
