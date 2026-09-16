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
import { TaskAutomated } from '../../../../graph/elements/task-automated.po';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

const label = 'ChkWt';
const expectedAutomatedPopupText = 'INFO: This is an automated task';

/** Default cases of the reusable marker suite, keyed by stable identifiers. */
export const markerSuiteCases = {
    shownAfterValidation: {
        title: 'should be shown after validation',
        run: async workflow => {
            await workflow.app.toolPalette.toolbar.validateTool().trigger();
            const task = await workflow.app.graph.getNodeByLabel(label, TaskAutomated);

            const marker = task.marker();
            await expect(marker.locate()).toBeVisible();
        }
    },
    popupOnHover: {
        title: 'should show a popup on hover',
        run: async workflow => {
            await workflow.app.toolPalette.toolbar.validateTool().trigger();
            const task = await workflow.app.graph.getNodeByLabel(label, TaskAutomated);
            expect(await task.marker().popupText()).toBe(expectedAutomatedPopupText);
        }
    },
    visibleAfterResizing: {
        title: 'should be still visible after resizing',
        run: async workflow => {
            await workflow.app.toolPalette.toolbar.validateTool().trigger();
            const task = await workflow.app.graph.getNodeByLabel(label, TaskAutomated);
            expect(await task.marker().popupText()).toBe(expectedAutomatedPopupText);

            await workflow.app.popup.close();
            await expect(task.popup().locate()).toBeHidden();

            const handle = await task.resizeHandles().ofKind('top-left');
            await handle.dragToRelativePosition({ x: 10, y: 10 });
            expect(await task.marker().popupText()).toBe(expectedAutomatedPopupText);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineMarkerSuite}. */
export type MarkerSuiteOptions = WorkflowSuiteOptions<typeof markerSuiteCases>;

/**
 * Registers the reusable marker suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineMarkerSuite(test: WorkflowTest, options?: MarkerSuiteOptions): void {
    test.describe('The marker', () => {
        const suite = workflowSuite(test, 'marker', markerSuiteCases, options);
        test(...suite.args('shownAfterValidation'));
        test(...suite.args('popupOnHover'));
        test(...suite.args('visibleAfterResizing'));
        suite.done();
    });
}
