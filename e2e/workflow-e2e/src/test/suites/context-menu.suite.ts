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
import type { TestInfo } from '@playwright/test';
import { ContextMenuIntegration, Integration, expect } from '@eclipse-glsp/playwright';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../suite';
import type { WorkflowTest } from '../workflow-test';

/**
 * Records which branch of the contract the case asserted.
 *
 * The integration is only known at runtime, so a single title has to cover both branches.
 * The annotation puts the branch that actually ran into the report.
 */
function annotateContextMenuSupport(testInfo: TestInfo, integration: Integration): void {
    testInfo.annotations.push({
        type: 'capability',
        description: ContextMenuIntegration.is(integration) ? 'context menu supported' : 'context menu not supported'
    });
}

/**
 * Default cases of the reusable context-menu suite, keyed by stable identifiers.
 *
 * A context menu is a capability of the host application, not of the diagram: only integrations
 * implementing {@link ContextMenuIntegration} have one, and `GLSPApp.contextMenu` is a stub that
 * throws for the others. Both halves of the contract are asserted here so that an integration
 * does not have to replace the cases to get the behavior its platform actually has.
 */
export const contextMenuSuiteCases = {
    open: {
        title: 'should be openable, or throw when the integration has no context menu',
        run: async ({ app, integration }, testInfo) => {
            annotateContextMenuSupport(testInfo, integration);

            if (!ContextMenuIntegration.is(integration)) {
                expect(() => app.contextMenu.open()).toThrow();
                return;
            }

            await app.contextMenu.open();
            await expect(app.contextMenu.locate()).toBeVisible();
        }
    },
    close: {
        title: 'should be closeable, or throw when the integration has no context menu',
        run: async ({ app, integration }, testInfo) => {
            annotateContextMenuSupport(testInfo, integration);

            if (!ContextMenuIntegration.is(integration)) {
                expect(() => app.contextMenu.close()).toThrow();
                return;
            }

            await app.contextMenu.open();
            await expect(app.contextMenu.locate()).toBeVisible();
            await app.contextMenu.close();
            await expect(app.contextMenu.locate()).toBeHidden();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineContextMenuSuite}. */
export type ContextMenuSuiteOptions = WorkflowSuiteOptions<typeof contextMenuSuiteCases>;

/**
 * Registers the reusable context-menu contract.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineContextMenuSuite(test: WorkflowTest, options?: ContextMenuSuiteOptions): void {
    test.describe('The context menu', () => {
        const suite = workflowSuite(test, 'contextMenu', contextMenuSuiteCases, options);
        test(...suite.args('open'));
        test(...suite.args('close'));
        suite.done();
    });
}
