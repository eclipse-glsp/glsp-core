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
import { TaskManual } from '../../../../../graph/elements/task-manual.po';
import { TaskManualNodes } from '../../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../../suite';
import type { WorkflowTest } from '../../../../workflow-test';

/** Default cases of the reusable deletion-tool suite, keyed by stable identifiers. */
export const deletionToolSuiteCases = {
    deleteByMouse: {
        title: 'should allow deleting elements in the graph by mouse',
        run: async workflow => {
            await workflow.app.toolPalette.toolbar.deletionTool().click();

            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            expect(await task.isVisible()).toBeTruthy();

            await task.click();
            await task.waitFor({ state: 'detached' });

            expect(await task.locate().count()).toBe(0);
        }
    },
    deleteByKeyboard: {
        title: 'should allow deleting elements in the graph by keyboard',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            expect(await task.locate().count()).toBe(1);
            await task.delete();
            expect(await task.locate().count()).toBe(0);
        }
    },
    delete: {
        title: 'should allow deleting elements in the graph',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            expect(await task.locate().count()).toBe(1);
            await task.delete();
            expect(await task.locate().count()).toBe(0);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineDeletionToolSuite}. */
export type DeletionToolSuiteOptions = WorkflowSuiteOptions<typeof deletionToolSuiteCases>;

/**
 * Registers the reusable deletion-tool suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineDeletionToolSuite(test: WorkflowTest, options?: DeletionToolSuiteOptions): void {
    test.describe('The deletion tool', () => {
        const suite = workflowSuite(test, 'deletionTool', deletionToolSuiteCases, options);
        test(...suite.args('deleteByMouse'));
        test(...suite.args('deleteByKeyboard'));
        test(...suite.args('delete'));
        suite.done();
    });
}
