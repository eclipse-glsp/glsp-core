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

import { expect, extractDebugInformationOfGLSPLocator, extractMetaTree } from '@eclipse-glsp/playwright';
import { TaskManual } from '../../../graph/elements/task-manual.po';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../suite';
import type { WorkflowTest } from '../../workflow-test';

const taskSelector = '[id$="task_Push"]';
const expectedElementMetadata = {
    id: 'sprotty_task_Push',
    type: 'task:manual',
    parent: 'sprotty_sprotty',
    children: [
        {
            id: 'sprotty_task_Push_icon',
            type: 'icon',
            parent: 'sprotty_task_Push',
            children: [],
            html: ''
        },
        {
            id: 'sprotty_task_Push_label',
            type: 'label:heading',
            parent: 'sprotty_task_Push',
            children: [],
            html: 'Push'
        }
    ],
    html: 'Push'
};
const expectedGLSPLocatorData = [
    {
        locator:
            "locator('body').locator('div.sprotty:not(.sprotty-hidden)').locator('[data-svg-metadata-type=\"graph\"]').locator('[id$=\"task_Push\"]').and(locator('body').locator('[data-svg-metadata-type=\"task:manual\"]'))",
        children: [
            '<g id="sprotty_task_Push" transform="translate(70, 100)" data-svg-metadata-type="task:manual" data-svg-metadata-parent-id="sprotty_sprotty" class="node task manual">...</g>'
        ]
    },
    {
        locator: "locator('body').locator('div.sprotty:not(.sprotty-hidden)')",
        children: ['<div id="sprotty" class="sprotty">...</div>']
    },
    { locator: "locator('body')", children: ['<body>...</body>'] }
];

/** Default cases of the reusable debug-functions suite, keyed by stable identifiers. */
export const debugStandaloneSuiteCases = {
    /** It is possible to extract all accessible SVG metadata of a locator as a tree structure. */
    locatorMetadata: {
        title: 'should allow to extract the metadata of a locator',
        run: async workflow => {
            const node = await workflow.app.graph.getNode(taskSelector, TaskManual);

            const metadata = await extractMetaTree(node.locate());
            expect(metadata).toMatchObject(expectedElementMetadata);
        }
    },
    /** It is possible to retrieve all located HTML elements of a GLSPLocator and its ancestors. */
    glspLocatorDebugInfo: {
        title: 'should allow to extract debug information of a GLSPLocator',
        run: async workflow => {
            const node = await workflow.app.graph.getNode(taskSelector, TaskManual);

            const extracted = await extractDebugInformationOfGLSPLocator(node.locator);
            expect(extracted).toMatchObject(expectedGLSPLocatorData);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineDebugStandaloneSuite}. */
export type DebugStandaloneSuiteOptions = WorkflowSuiteOptions<typeof debugStandaloneSuiteCases>;

/**
 * Registers the reusable debug-functions suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineDebugStandaloneSuite(test: WorkflowTest, options?: DebugStandaloneSuiteOptions): void {
    test.describe('The debug functions', () => {
        const suite = workflowSuite(test, 'debug', debugStandaloneSuiteCases, options);
        test(...suite.args('locatorMetadata'));
        test(...suite.args('glspLocatorDebugInfo'));
        suite.done();
    });
}
