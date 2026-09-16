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
import { ServerVariable, expect } from '@eclipse-glsp/playwright';
import { Edge } from '../../../../graph/elements/edge.po';
import { TaskAutomated } from '../../../../graph/elements/task-automated.po';
import { TaskManual } from '../../../../graph/elements/task-manual.po';
import { GLSP_SERVER_TYPE_JAVA, GLSP_SERVER_TYPE_NODE } from '../../../../server';
import { TaskAutomatedNodes, TaskManualNodes } from '../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../suite';
import type { WorkflowTest } from '../../../workflow-test';

/** Default cases of the reusable command-palette suite, keyed by stable identifiers. */
export const commandPaletteSuiteCases = {
    globalSearch: {
        title: 'should allow to search suggestions',
        run: async workflow => {
            expect(await workflow.app.globalCommandPalette.isHidden()).toBeTruthy();

            await workflow.app.globalCommandPalette.open();
            expect(await workflow.app.globalCommandPalette.isVisible()).toBeTruthy();

            const suggestions = await workflow.app.globalCommandPalette.suggestions();
            const expectedSuggestions = new ServerVariable({
                server: workflow.glspServer,
                value: {
                    [GLSP_SERVER_TYPE_NODE]: [
                        'Create Manual Task',
                        'Create Category',
                        'Create Automated Task',
                        'Create Merge Node',
                        'Create Decision Node',
                        'Delete All',
                        'Reveal Push',
                        'Reveal ChkWt',
                        'Reveal WtOK',
                        'Reveal RflWt',
                        'Reveal Brew',
                        'Reveal ChkTp',
                        'Reveal KeepTp',
                        'Reveal PreHeat'
                    ],
                    [GLSP_SERVER_TYPE_JAVA]: [
                        'Create Manual Task',
                        'Create Category',
                        'Create Automated Task',
                        'Create Merge Node',
                        'Create Decision Node',
                        'Reveal Push',
                        'Reveal ChkWt',
                        'Reveal WtOK',
                        'Reveal RflWt',
                        'Reveal Brew',
                        'Reveal ChkTp',
                        'Reveal KeepTp',
                        'Reveal PreHeat'
                    ]
                }
            });
            expect(suggestions.sort()).toEqual(expectedSuggestions.get().sort());

            await workflow.app.globalCommandPalette.search('Create');
            const createSuggestions = await workflow.app.globalCommandPalette.suggestions();
            const expectedCreateSuggestions = [
                'Create Manual Task',
                'Create Category',
                'Create Automated Task',
                'Create Merge Node',
                'Create Decision Node'
            ];
            expect(createSuggestions.sort()).toEqual(expectedCreateSuggestions.sort());
        }
    },
    globalConfirm: {
        title: 'should allow to confirm suggestions',
        run: async workflow => {
            const before = await workflow.app.graph.getNodesOfType(TaskManual);

            await workflow.app.graph.waitForCreationOfType(TaskManual, async () => {
                await workflow.app.globalCommandPalette.open();
                await workflow.app.globalCommandPalette.search('Create');
                await workflow.app.globalCommandPalette.confirm('Create Manual Task');
            });

            const after = await workflow.app.graph.getNodesOfType(TaskManual);
            expect(after.length).toBe(before.length + 1);

            const names = await Promise.all(
                after.map(async element => {
                    const label = await element.children.label();
                    return label.textContent();
                })
            );
            expect(names).toContain('ManualTask8');
        }
    },
    globalCreateNode: {
        title: 'should allow creating new elements in the diagram',
        run: async workflow => {
            const nodes = await workflow.app.graph.waitForCreationOfType(TaskManual, async () => {
                const command = await workflow.app.globalCommandPalette;
                await command.open();
                await command.search('Create Manual Task', { confirm: true });
            });
            expect(nodes).toHaveLength(1);
            await workflow.app.graph.focus();

            const newTask = nodes[0];

            const label = await newTask.children.label();
            expect(await label.textContent()).toBe('ManualTask8');
        }
    },
    elementSearch: {
        title: 'should allow to search suggestions',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            const elementCommandPalette = await task.commandPalette();
            await elementCommandPalette.open();
            const suggestions = await elementCommandPalette.suggestions();
            const expectedSuggestions = [
                'Create Category',
                'Create Manual Task',
                'Create Merge Node',
                'Create Automated Task',
                'Create Decision Node',
                'Create Edge to Push',
                'Create Edge to WtOK',
                'Create Edge to KeepTp',
                'Create Edge to RflWt',
                'Create Edge to ChkTp',
                'Create Edge to Brew',
                'Create Edge to ChkWt',
                'Create Edge to PreHeat',
                'Create Weighted Edge to Push',
                'Create Weighted Edge to WtOK',
                'Create Weighted Edge to KeepTp',
                'Create Weighted Edge to RflWt',
                'Create Weighted Edge to ChkTp',
                'Create Weighted Edge to Brew',
                'Create Weighted Edge to ChkWt',
                'Create Weighted Edge to PreHeat',
                'Delete',
                'Reveal Push',
                'Reveal ChkWt',
                'Reveal WtOK',
                'Reveal RflWt',
                'Reveal Brew',
                'Reveal ChkTp',
                'Reveal KeepTp',
                'Reveal PreHeat'
            ];
            expect(suggestions.sort()).toEqual(expectedSuggestions.sort());

            await elementCommandPalette.search('Create');
            const createSuggestions = await elementCommandPalette.suggestions();
            const expectedCreateSuggestions = [
                'Create Manual Task',
                'Create Merge Node',
                'Create Automated Task',
                'Create Decision Node',
                'Create Category',
                'Create Edge to ChkWt',
                'Create Edge to Push',
                'Create Edge to WtOK',
                'Create Edge to PreHeat',
                'Create Edge to Brew',
                'Create Edge to ChkTp',
                'Create Edge to RflWt',
                'Create Edge to KeepTp',
                'Create Weighted Edge to ChkWt',
                'Create Weighted Edge to Push',
                'Create Weighted Edge to WtOK',
                'Create Weighted Edge to PreHeat',
                'Create Weighted Edge to Brew',
                'Create Weighted Edge to ChkTp',
                'Create Weighted Edge to RflWt',
                'Create Weighted Edge to KeepTp'
            ];
            expect(createSuggestions.sort()).toEqual(expectedCreateSuggestions.sort());
        }
    },
    elementCreateNode: {
        title: 'should allow creating new elements in the diagram',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            const nodes = await workflow.app.graph.waitForCreationOfType(TaskManual, async () => {
                const command = task.commandPalette();
                await command.open();
                await command.search('Create Manual Task', { confirm: true });
            });
            expect(nodes).toHaveLength(1);
            await workflow.app.graph.focus();

            const newTask = nodes[0];

            const label = await newTask.children.label();
            expect(await label.textContent()).toBe('ManualTask8');
        }
    },
    elementCreateEdge: {
        title: 'should allow creating edges in the graph',
        run: async workflow => {
            const source = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const target = await workflow.app.graph.getNodeByLabel(TaskAutomatedNodes.chkwtLabel, TaskAutomated);

            const edges = await workflow.app.graph.waitForCreationOfType(Edge, async () => {
                const command = source.commandPalette();
                await command.open();

                const targetLabel = await target.children.label();
                await command.search('create edge to ' + (await targetLabel.textContent()), { confirm: true });
            });
            expect(edges.length).toBe(1);
            await workflow.app.graph.focus();

            const newEdge = edges[0];

            const sourceId = await newEdge.sourceId();
            expect(sourceId).toBe(await source.idAttr());

            const targetId = await newEdge.targetId();
            expect(targetId).toBe(await target.idAttr());
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineCommandPaletteSuite}. */
export type CommandPaletteSuiteOptions = WorkflowSuiteOptions<typeof commandPaletteSuiteCases>;

/**
 * Registers the reusable command-palette suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineCommandPaletteSuite(test: WorkflowTest, options?: CommandPaletteSuiteOptions): void {
    test.describe('The command palette', () => {
        const suite = workflowSuite(test, 'commandPalette', commandPaletteSuiteCases, options);

        test.describe('in the global context', () => {
            test(...suite.args('globalSearch'));
            test(...suite.args('globalConfirm'));
            test(...suite.args('globalCreateNode'));
        });

        test.describe('in the element context', () => {
            test(...suite.args('elementSearch'));
            test(...suite.args('elementCreateNode'));
            test(...suite.args('elementCreateEdge'));
        });

        suite.done();
    });
}
