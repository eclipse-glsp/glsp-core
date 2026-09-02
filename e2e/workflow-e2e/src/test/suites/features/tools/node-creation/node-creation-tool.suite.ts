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
import { expect } from '@eclipse-glsp/playwright';
import { CursorCSS } from '../../../../../cursors-css';
import { Category } from '../../../../../graph/elements/category.po';
import { TaskManual } from '../../../../../graph/elements/task-manual.po';
import { CategoryNodes, TaskManualNodes } from '../../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../../suite';
import type { WorkflowTest } from '../../../../workflow-test';

/** Default cases of the reusable node-creation-tool suite, keyed by stable identifiers. */
export const nodeCreationToolSuiteCases = {
    createNode: {
        title: 'should allow creating new nodes in the graph',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const nodes = await workflow.app.graph.waitForCreationOfType(TaskManual, async () => {
                const paletteItem = await workflow.app.toolPalette.content.toolElement('Nodes', 'Manual Task');
                await paletteItem.click();

                await expect(workflow.app.graph).toContainClass(CursorCSS.NODE_CREATION);

                const taskBounds = await task.bounds();
                await taskBounds.position('bottom_left').moveRelative(-50, 0).click();
            });
            expect(nodes).toHaveLength(1);
            await workflow.app.graph.focus();

            const newTask = nodes[0];

            const label = await newTask.children.label();
            expect(await label.textContent()).toBe(TaskManualNodes.createdLabel(workflow.glspServer).get());
        }
    },
    createChildNode: {
        title: 'should allow creating new child nodes',
        run: async workflow => {
            // Create a new category
            let nodes = await workflow.app.graph.waitForCreationOfType(Category, async () => {
                const paletteItem = await workflow.app.toolPalette.content.toolElement('Nodes', 'Category');
                await paletteItem.click();

                await expect(workflow.app.graph).toContainClass(CursorCSS.NODE_CREATION);

                const node = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
                const bounds = await node.bounds();
                await bounds.position('bottom_left').moveRelative(0, 60).click();
            });
            expect(nodes).toHaveLength(1);
            await workflow.app.graph.focus();

            const newCategory = nodes[0];

            let label = await newCategory.children.label();
            expect(await label.textContent()).toBe(CategoryNodes.createdLabel(workflow.glspServer).get());

            // Create a new task inside the category
            nodes = await workflow.app.graph.waitForCreationOfType(TaskManual, async () => {
                const paletteItem = await workflow.app.toolPalette.content.toolElement('Nodes', 'Manual Task');
                await paletteItem.click();

                await expect(workflow.app.graph).toContainClass(CursorCSS.NODE_CREATION);

                const bounds = await newCategory.bounds();
                await bounds.position('middle_right').click();
            });
            expect(nodes).toHaveLength(1);
            await workflow.app.graph.focus();

            const newTask = nodes[0];

            label = await newTask.children.label();
            expect(await label.textContent()).toBe(TaskManualNodes.createdLabel(workflow.glspServer).get());
            // Check if it is inside the category
            const children = await newCategory.children.allOfType(TaskManual);
            expect(children).toHaveLength(1);
            expect(await children[0].idAttr()).toBe(await newTask.idAttr());
        }
    },
    preventInvalidCombinations: {
        title: 'should prevent invalid combinations',
        run: async workflow => {
            const paletteItem = await workflow.app.toolPalette.content.toolElement('Nodes', 'Manual Task');
            await paletteItem.click();

            await expect(workflow.app.graph).toContainClass(CursorCSS.NODE_CREATION);

            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const bounds = await task.bounds();
            await bounds.position('middle_right').move();

            await expect(workflow.app.graph).not.toContainClass(CursorCSS.NODE_CREATION);
            await expect(workflow.app.graph).toContainClass(CursorCSS.OPERATION_NOT_ALLOWED);
        }
    },
    cancel: {
        title: 'should allow to cancel the operation',
        run: async workflow => {
            const paletteItem = await workflow.app.toolPalette.content.toolElement('Nodes', 'Manual Task');
            await paletteItem.click();

            await expect(workflow.app.graph).toContainClass(CursorCSS.NODE_CREATION);

            await workflow.app.graph.focus();
            await workflow.app.page.keyboard.press('Escape');

            await expect(workflow.app.graph).not.toContainClass(CursorCSS.NODE_CREATION);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineNodeCreationToolSuite}. */
export type NodeCreationToolSuiteOptions = WorkflowSuiteOptions<typeof nodeCreationToolSuiteCases>;

/**
 * Registers the reusable node-creation-tool suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineNodeCreationToolSuite(test: WorkflowTest, options?: NodeCreationToolSuiteOptions): void {
    test.describe('The node creation tool', () => {
        const suite = workflowSuite(test, 'nodeCreationTool', nodeCreationToolSuiteCases, options);
        test(...suite.args('createNode'));
        test(...suite.args('createChildNode'));
        test(...suite.args('preventInvalidCombinations'));
        test(...suite.args('cancel'));
        suite.done();
    });
}
