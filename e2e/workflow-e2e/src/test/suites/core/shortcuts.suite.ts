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
import { TaskManual } from '../../../graph/elements/task-manual.po';
import { TaskManualNodes } from '../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../suite';
import type { WorkflowTest } from '../../workflow-test';

/** Default cases of the reusable Shortcuts suite, keyed by stable identifiers. */
export const shortcutsSuiteCases = {
    delete: {
        title: 'should allow deleting the element in the graph',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            expect(await task.isVisible()).toBeTruthy();

            await task.click();
            await workflow.app.page.keyboard.press('Delete');
            await task.waitFor({ state: 'detached' });

            expect(await task.locate().count()).toBe(0);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineShortcutsSuite}. */
export type ShortcutsSuiteOptions = WorkflowSuiteOptions<typeof shortcutsSuiteCases>;

/**
 * Registers the reusable Shortcuts suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineShortcutsSuite(test: WorkflowTest, options?: ShortcutsSuiteOptions): void {
    test.describe('Shortcuts', () => {
        const suite = workflowSuite(test, 'shortcuts', shortcutsSuiteCases, options);
        test(...suite.args('delete'));
        suite.done();
    });
}
