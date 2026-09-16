/********************************************************************************
 * Copyright (c) 2023-2026 Business Informatics Group (TU Wien) and others.
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
import { Marker, expect } from '@eclipse-glsp/playwright';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable tool-palette suite, keyed by stable identifiers. */
export const toolPaletteSuiteCases = {
    contentItems: {
        title: 'should allow to access the content items',
        run: async workflow => {
            await workflow.app.toolPalette.waitForVisible();

            const groups = await workflow.app.toolPalette.content.toolGroups();
            expect(groups.length).toBe(2);
            expect(await groups[0].header()).toBe('Nodes');
            expect(await groups[1].header()).toBe('Edges');

            const elements0 = await groups[0].items();
            expect(elements0.length).toBe(7);
            expect(await elements0[0].text()).toBe('Automated Task');

            const elements1 = await groups[1].items();
            expect(elements1.length).toBe(2);
            expect(await elements1[1].text()).toBe('Weighted edge');

            const headerGroup = await workflow.app.toolPalette.content.toolGroupByHeaderText('Edges');
            expect(await headerGroup.header()).toBe('Edges');

            const headerElements = await headerGroup.items();
            expect(headerElements.length).toBe(2);
            expect(await headerElements[0].text()).toBe('Edge');
            expect(await headerElements[1].text()).toBe('Weighted edge');

            const toolElement = await workflow.app.toolPalette.content.toolElement('Nodes', 'Merge Node');
            expect(await toolElement.text()).toBe('Merge Node');
        }
    },
    toolbarItems: {
        title: 'should allow to access the toolbar items',
        run: async workflow => {
            await workflow.app.toolPalette.waitForVisible();

            const deleteTool = await workflow.app.toolPalette.toolbar.deletionTool();
            await expect(deleteTool).not.toContainClass('clicked');
            await deleteTool.click();

            const selectionTool = await workflow.app.toolPalette.toolbar.selectionTool();
            await expect(selectionTool).not.toContainClass('clicked');
            await selectionTool.click();

            const marqueeTool = await workflow.app.toolPalette.toolbar.marqueeTool();
            await expect(marqueeTool).not.toContainClass('clicked');
            await marqueeTool.click();

            const searchTool = await workflow.app.toolPalette.toolbar.searchTool();
            expect(searchTool.input.isHidden()).toBeTruthy();

            await searchTool.click();
            expect(searchTool.input.isVisible()).toBeTruthy();
            await searchTool.search('Auto');

            const groups = await workflow.app.toolPalette.content.toolGroups();
            expect(groups.length).toBe(1);
            expect(await groups[0].header()).toBe('Nodes');

            const elements0 = await groups[0].items();
            expect(elements0.length).toBe(1);
            expect(await elements0[0].text()).toBe('Automated Task');
        }
    },
    validate: {
        title: 'should allow to validate',
        run: async workflow => {
            const markers = await workflow.app.graph.waitForCreationOfType(Marker, async () => {
                await workflow.app.toolPalette.toolbar.validateTool().click();
            });

            expect(markers.length).toBeGreaterThan(0);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineToolPaletteSuite}. */
export type ToolPaletteSuiteOptions = WorkflowSuiteOptions<typeof toolPaletteSuiteCases>;

/**
 * Registers the reusable tool-palette suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineToolPaletteSuite(test: WorkflowTest, options?: ToolPaletteSuiteOptions): void {
    test.describe('The tool palette', () => {
        const suite = workflowSuite(test, 'toolPalette', toolPaletteSuiteCases, options);
        test(...suite.args('contentItems'));
        test(...suite.args('toolbarItems'));
        test(...suite.args('validate'));
        suite.done();
    });
}
