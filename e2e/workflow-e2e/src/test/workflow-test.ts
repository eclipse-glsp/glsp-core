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
import { GLSPServer, Integration, test as base } from '@eclipse-glsp/playwright';
import { WorkflowApp } from '../app/workflow-app';

/**
 * Application-specific objects shared by the reusable Workflow test suites.
 */
export interface WorkflowTestContext {
    app: WorkflowApp;
    glspServer: GLSPServer;
    integration: Integration;
}

/**
 * Fixtures made available by the Workflow test instance.
 */
export interface WorkflowTestFixtures {
    workflow: WorkflowTestContext;
}

/**
 * Test instance used to register reusable Workflow test suites.
 */
export const test = base.extend<WorkflowTestFixtures>({
    workflow: async ({ integration, glspServer }, use) => {
        const app = new WorkflowApp({
            type: 'integration',
            integration
        });
        await app.waitForReady();

        await use({
            app,
            glspServer,
            integration
        });
    }
});

export type WorkflowTest = typeof test;
