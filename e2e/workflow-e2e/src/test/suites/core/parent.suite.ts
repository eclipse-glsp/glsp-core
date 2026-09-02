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
import { LabelHeading } from '../../../graph/elements/label-heading.po';
import { TaskManual } from '../../../graph/elements/task-manual.po';
import { TaskManualNodes } from '../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../suite';
import type { WorkflowTest } from '../../workflow-test';

/** Default cases of the reusable parent-element children-accessor suite, keyed by stable identifiers. */
export const parentSuiteCases = {
    allElementsByType: {
        title: 'should allow to access all elements by using a type',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const children = task.children;

            const labels = await children.allOfType(LabelHeading);
            expect(labels.length).toBe(1);

            const label = labels[0];
            expect(await label.textContent()).toBe('Push');
        }
    },
    elementByType: {
        title: 'should allow to access the element by using a type',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const children = task.children;

            const label = await children.ofType(LabelHeading);
            expect(await label.textContent()).toBe('Push');
        }
    },
    elementByTypeAndSelector: {
        title: 'should allow to access the element by using a type and a selector',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const children = task.children;

            const label = await children.ofType(LabelHeading, { selector: '[id$="task_Push_label"]' });
            expect(await label.textContent()).toBe('Push');
        }
    },
    typedElements: {
        title: 'should allow to use typed elements',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const children = task.children;

            const label = await children.label();
            expect(await label.textContent()).toBe('Push');
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineParentSuite}. */
export type ParentSuiteOptions = WorkflowSuiteOptions<typeof parentSuiteCases>;

/**
 * Registers the reusable parent-element children-accessor suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineParentSuite(test: WorkflowTest, options?: ParentSuiteOptions): void {
    test.describe('The children accessor of a parent element', () => {
        const suite = workflowSuite(test, 'parent', parentSuiteCases, options);
        test(...suite.args('allElementsByType'));
        test(...suite.args('elementByType'));
        test(...suite.args('elementByTypeAndSelector'));
        test(...suite.args('typedElements'));
        suite.done();
    });
}
