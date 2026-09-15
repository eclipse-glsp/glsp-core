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

import { PModelElement, expect } from '@eclipse-glsp/playwright';
import { TaskManual } from '../../../../graph/elements/task-manual.po';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable selection suite, keyed by stable identifiers. */
export const selectSuiteCases = {
    selectSingle: {
        title: 'should allow to select a single element',
        run: async workflow => {
            const element = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            await element.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element]
            });
        }
    },
    deselectOnNewSelection: {
        title: 'should deselect after a new selection',
        run: async workflow => {
            const element1 = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            await element1.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element1]
            });

            const element2 = await workflow.app.graph.getNodeByLabel('RflWt', TaskManual);
            await element2.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element2]
            });
        }
    },
    selectMultiple: {
        title: 'should allow to select multiple elements',
        run: async workflow => {
            const element1 = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            await element1.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element1]
            });

            const element2 = await workflow.app.graph.getNodeByLabel('RflWt', TaskManual);
            await element2.select({ modifiers: ['Control'] });
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element1, element2]
            });
        }
    },
    selectAllByShortcut: {
        title: 'should allow to select all elements by using a shortcut',
        run: async workflow => {
            await workflow.app.graph.locate().click();
            await workflow.app.page.keyboard.press('Control+A');
            await expect(workflow.app.graph).toHaveSelected({
                type: PModelElement,
                elements: () => workflow.app.graph.getAllModelElements()
            });
        }
    },
    deselectByClickOutside: {
        title: 'should allow to deselect a single element by clicking outside',
        run: async workflow => {
            const element = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            await element.select();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskManual,
                elements: [element]
            });

            await workflow.app.graph.locate().click();
            await expect(workflow.app.graph).toBeUnselected();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineSelectSuite}. */
export type SelectSuiteOptions = WorkflowSuiteOptions<typeof selectSuiteCases>;

/**
 * Registers the reusable selection suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineSelectSuite(test: WorkflowTest, options?: SelectSuiteOptions): void {
    test.describe('The select feature', () => {
        const suite = workflowSuite(test, 'select', selectSuiteCases, options);
        test(...suite.args('selectSingle'));
        test(...suite.args('deselectOnNewSelection'));
        test(...suite.args('selectMultiple'));
        test(...suite.args('selectAllByShortcut'));
        test(...suite.args('deselectByClickOutside'));
        suite.done();
    });
}
