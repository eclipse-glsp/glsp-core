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

import { expect } from '@eclipse-glsp/playwright';
import { TaskManual } from '../../../../graph/elements/task-manual.po';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable standalone select-keybinding suite, keyed by stable identifiers. */
export const selectKeybindingStandaloneSuiteCases = {
    deselectSingle: {
        title: 'should allow to deselect a single element through a keybinding',
        run: async workflow => {
            const page = workflow.app.page;
            const element = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            await element.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element]
            });

            // Selection
            await page.keyboard.press('Escape');

            await expect(workflow.app.graph).toBeUnselected();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineSelectKeybindingStandaloneSuite}. */
export type SelectKeybindingStandaloneSuiteOptions = WorkflowSuiteOptions<typeof selectKeybindingStandaloneSuiteCases>;

/**
 * Registers the reusable standalone select-keybinding suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineSelectKeybindingStandaloneSuite(test: WorkflowTest, options?: SelectKeybindingStandaloneSuiteOptions): void {
    test.describe('The select keybinding', () => {
        const suite = workflowSuite(test, 'selectKeybinding', selectKeybindingStandaloneSuiteCases, options);
        test(...suite.args('deselectSingle'));
        suite.done();
    });
}
