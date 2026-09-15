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
import { expect, provideDiagramShortcut } from '@eclipse-glsp/playwright';
import { TaskAutomated } from '../../../../graph/elements/task-automated.po';
import { TaskManual } from '../../../../graph/elements/task-manual.po';
import { assertPopup, automatedLabel, expectedAutomatedPopupText, expectedManualPopupText, manualLabel } from '../../../../popup-text';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable popup suite, keyed by stable identifiers. */
export const popupSuiteCases = {
    shownOnHover: {
        title: 'should be shown on hovering a task manual',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(manualLabel, TaskManual);

            await expect(workflow.app.popup.locate()).toBeHidden();
            await task.hover();
            await workflow.app.popup.waitForVisible();
            await expect(workflow.app.popup.locate()).toBeVisible();

            const popup = task.popup();
            expect(await popup.innerText()).toBe(expectedManualPopupText(workflow.glspServer));
        }
    },
    textFromElement: {
        title: 'should allow to access the text directly in elements',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(manualLabel, TaskManual);
            await expect(workflow.app.popup.locate()).toBeHidden();
            const text = await task.popupText();
            await expect(workflow.app.popup.locate()).toBeVisible();
            expect(text).toBe(expectedManualPopupText(workflow.glspServer));
        }
    },
    closeOnEscape: {
        title: 'escape',
        run: async workflow => {
            await workflow.app.graph.focus();
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));

            await workflow.app.page.keyboard.press('Escape');
            await workflow.app.popup.waitForHidden();

            await expect(workflow.app.popup.locate()).toBeHidden();
        }
    },
    closeOnNewHover: {
        title: 'new hover',
        run: async workflow => {
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));

            await workflow.app.popup.close();

            await assertPopup(workflow.app, automatedLabel, TaskAutomated, expectedAutomatedPopupText(workflow.glspServer));
        }
    },
    closeOnMouseAway: {
        title: 'mouse moved away',
        run: async workflow => {
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));

            const bounds = await workflow.app.graph.bounds();
            await bounds.position('middle_center').move();
            await workflow.app.popup.waitForHidden();

            await expect(workflow.app.popup.locate()).toBeHidden();
        }
    },
    closeOnFocusLost: {
        title: 'focus lost',
        run: async workflow => {
            const task = await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));

            await workflow.app.graph.locate().click();
            await workflow.app.popup.waitForHidden();

            await expect(task.popup().locate()).toBeHidden();
        }
    },
    closeOnCenter: {
        title: 'center command',
        run: async workflow => {
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));
            await workflow.app.graph.focus();
            await workflow.app.page.keyboard.press(provideDiagramShortcut(workflow.integration, 'center'));
            await workflow.app.popup.waitForHidden();

            await expect(workflow.app.popup.locate()).toBeHidden();
        }
    },
    closeOnFitToScreen: {
        title: 'fit to screen command',
        run: async workflow => {
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));
            await workflow.app.graph.focus();
            await workflow.app.page.keyboard.press(provideDiagramShortcut(workflow.integration, 'fitToScreen'));
            await workflow.app.popup.waitForHidden();

            await expect(workflow.app.popup.locate()).toBeHidden();
        }
    },
    closeOnLayout: {
        title: 'layout command',
        run: async workflow => {
            await assertPopup(workflow.app, manualLabel, TaskManual, expectedManualPopupText(workflow.glspServer));
            await workflow.app.graph.focus();
            await workflow.app.page.keyboard.press(provideDiagramShortcut(workflow.integration, 'layout'));
            await workflow.app.popup.waitForHidden();

            await expect(workflow.app.popup.locate()).toBeHidden();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link definePopupSuite}. */
export type PopupSuiteOptions = WorkflowSuiteOptions<typeof popupSuiteCases>;

/**
 * Registers the reusable popup suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function definePopupSuite(test: WorkflowTest, options?: PopupSuiteOptions): void {
    test.describe('The popup', () => {
        const suite = workflowSuite(test, 'popup', popupSuiteCases, options);

        test(...suite.args('shownOnHover'));
        test(...suite.args('textFromElement'));

        test.describe('should be closed on', () => {
            test(...suite.args('closeOnEscape'));
            test(...suite.args('closeOnNewHover'));
            test(...suite.args('closeOnMouseAway'));
            test(...suite.args('closeOnFocusLost'));
            test(...suite.args('closeOnCenter'));
            test(...suite.args('closeOnFitToScreen'));
            test(...suite.args('closeOnLayout'));
        });

        suite.done();
    });
}
