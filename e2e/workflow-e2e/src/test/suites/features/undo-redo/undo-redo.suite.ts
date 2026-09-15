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
import { expect, provideUndoRedoTrigger } from '@eclipse-glsp/playwright';
import { TaskManual } from '../../../../graph/elements/task-manual.po';
import { TaskManualNodes } from '../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable undo/redo suite, keyed by stable identifiers. */
export const undoRedoSuiteCases = {
    undoRedo: {
        title: 'should allow undo and redo',
        run: async workflow => {
            const trigger = provideUndoRedoTrigger(workflow.integration, workflow.app);
            await expect(workflow.app.graph).toContainElement({ type: TaskManual, query: { label: TaskManualNodes.pushLabel } });

            const node = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            await node.delete();

            await expect(workflow.app.graph).not.toContainElement({
                type: TaskManual,
                query: { label: TaskManualNodes.pushLabel }
            });

            await trigger.undo();

            await expect(workflow.app.graph).toContainElement({ type: TaskManual, query: { label: TaskManualNodes.pushLabel } });

            await trigger.redo();

            await expect(workflow.app.graph).not.toContainElement({
                type: TaskManual,
                query: { label: TaskManualNodes.pushLabel }
            });
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineUndoRedoSuite}. */
export type UndoRedoSuiteOptions = WorkflowSuiteOptions<typeof undoRedoSuiteCases>;

/**
 * Registers the reusable undo/redo suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineUndoRedoSuite(test: WorkflowTest, options?: UndoRedoSuiteOptions): void {
    test.describe('The undo redo trigger', () => {
        const suite = workflowSuite(test, 'undoRedo', undoRedoSuiteCases, options);
        test(...suite.args('undoRedo'));
        suite.done();
    });
}
