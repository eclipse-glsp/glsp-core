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
import { expect, provideMarkerNavigator } from '@eclipse-glsp/playwright';
import { TaskAutomated } from '../../../../graph/elements/task-automated.po';
import { TaskAutomatedNodes } from '../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

const element1 = TaskAutomatedNodes.chkwtLabel;
const element2 = TaskAutomatedNodes.wtokLabel;
const element3 = TaskAutomatedNodes.brewLabel;
const element4 = TaskAutomatedNodes.keepTpLabel;
const element5 = TaskAutomatedNodes.chktpLabel;
const element6 = TaskAutomatedNodes.preheatLabel;

const forwardOrder = [element1, element2, element3, element4, element5, element6, element1];
const backwardOrder = [element1, element6, element5, element4, element3, element2, element1, element6];

/** Default cases of the reusable marker-navigator suite, keyed by stable identifiers. */
export const markerNavigatorSuiteCases = {
    navigateToFirst: {
        title: 'should navigate to the first element',
        run: async workflow => {
            const navigator = provideMarkerNavigator(workflow.integration, workflow.app);
            await navigator.trigger();
            await navigator.navigateForward();
            await expect(workflow.app.graph).toHaveSelected({
                type: TaskAutomated,
                elements: [await workflow.app.graph.getNodeByLabel(element1, TaskAutomated)]
            });
        }
    },
    navigateForwards: {
        title: 'should navigate forwards through the elements',
        run: async workflow => {
            const navigator = provideMarkerNavigator(workflow.integration, workflow.app);
            await navigator.trigger();
            for (const order of forwardOrder) {
                await navigator.navigateForward();
                await expect(workflow.app.graph).toHaveSelected({
                    type: TaskAutomated,
                    elements: [await workflow.app.graph.getNodeByLabel(order, TaskAutomated)]
                });
            }
        }
    },
    navigateBackwards: {
        title: 'should navigate backwards through the elements',
        run: async workflow => {
            const navigator = provideMarkerNavigator(workflow.integration, workflow.app);
            await navigator.trigger();
            for (const order of backwardOrder) {
                await navigator.navigateBackward();
                await expect(workflow.app.graph).toHaveSelected({
                    type: TaskAutomated,
                    elements: [await workflow.app.graph.getNodeByLabel(order, TaskAutomated)]
                });
            }
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineMarkerNavigatorSuite}. */
export type MarkerNavigatorSuiteOptions = WorkflowSuiteOptions<typeof markerNavigatorSuiteCases>;

/**
 * Registers the reusable marker-navigator suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineMarkerNavigatorSuite(test: WorkflowTest, options?: MarkerNavigatorSuiteOptions): void {
    test.describe('The marker navigator', () => {
        const suite = workflowSuite(test, 'markerNavigator', markerNavigatorSuiteCases, options);
        test(...suite.args('navigateToFirst'));
        test(...suite.args('navigateForwards'));
        test(...suite.args('navigateBackwards'));
        suite.done();
    });
}
