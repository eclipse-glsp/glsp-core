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
import { ActivityNodeFork } from '../../../graph/elements/activity-node-fork.po';
import { Edge } from '../../../graph/elements/edge.po';
import { TaskManual } from '../../../graph/elements/task-manual.po';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../suite';
import type { WorkflowTest } from '../../workflow-test';

/** Default cases of the reusable graph suite, keyed by stable identifiers. */
export const graphSuiteCases = {
    edgeBySelector: {
        title: 'by using a selector',
        run: async workflow => {
            const edge = await workflow.app.graph.getEdge('[id$="edge_task_Push_fork_1"]', Edge);
            const task = await edge.sourceOfType(TaskManual);

            expect(await (await task.children.label()).textContent()).toBe('Push');
        }
    },
    edgeBySourceType: {
        title: 'by using a source type',
        run: async workflow => {
            const edges = await workflow.app.graph.getEdgesOfType(Edge, { sourceConstructor: TaskManual });

            const ids = await Promise.all(edges.map(async e => e.idAttr()));
            const expectedIds = ['edge_task_Push_fork_1', 'edge_task_RflWt_merge_1'];

            expect(ids.length).toBe(expectedIds.length);
            ids.forEach(id => {
                if (!expectedIds.some(e => id.includes(e))) {
                    throw new Error(`${id} is not in the list of expected ids: ${expectedIds}`);
                }
            });
        }
    },
    edgeBySourceSelector: {
        title: 'by using a source selector',
        run: async workflow => {
            const sourceNode = await workflow.app.graph.getNodeByLabel('Push', TaskManual);
            const edges = await workflow.app.graph.getEdgesOfType(Edge, { sourceSelectorOrLocator: sourceNode.locate() });
            expect(edges.length).toBe(1);

            const source = await edges[0].sourceOfType(TaskManual);
            expect(await source.idAttr()).toContain(await sourceNode.idAttr());
        }
    },
    edgesBySourceType: {
        title: 'by using the source type with multiple elements',
        run: async workflow => {
            const edges = await workflow.app.graph.getEdgesOfType(Edge, { sourceConstructor: TaskManual });

            const ids = await Promise.all(edges.map(async e => e.idAttr()));
            const expectedIds = ['edge_task_Push_fork_1', 'edge_task_RflWt_merge_1'];

            expect(ids.length).toBe(expectedIds.length);
            for await (const [index, id] of ids.entries()) {
                expect(await edges[index].source()).toBeInstanceOf(TaskManual);
                if (!expectedIds.some(e => id.includes(e))) {
                    throw new Error(`${id} is not in the list of expected ids: ${expectedIds}`);
                }
            }
        }
    },
    edgesByTargetType: {
        title: 'by using a target type',
        run: async workflow => {
            const edges = await workflow.app.graph.getEdgesOfType(Edge, { targetConstructor: ActivityNodeFork });

            const ids = await Promise.all(edges.map(async e => e.idAttr()));
            const expectedIds = ['edge_task_Push_fork_1'];

            expect(ids.length).toBe(expectedIds.length);
            for await (const [index, id] of ids.entries()) {
                expect(await edges[index].target()).toBeInstanceOf(ActivityNodeFork);
                if (!expectedIds.some(e => id.includes(e))) {
                    throw new Error(`${id} is not in the list of expected ids: ${expectedIds}`);
                }
            }
        }
    },
    edgesBySourceAndTargetType: {
        title: 'by using the source and target type',
        run: async workflow => {
            const edges = await workflow.app.graph.getEdgesOfType(Edge, {
                sourceConstructor: TaskManual,
                targetConstructor: ActivityNodeFork
            });

            const ids = await Promise.all(edges.map(async e => e.idAttr()));
            const expectedIds = ['edge_task_Push_fork_1'];

            expect(ids.length).toBe(expectedIds.length);
            for await (const [index, id] of ids.entries()) {
                expect(await edges[index].source()).toBeInstanceOf(TaskManual);
                expect(await edges[index].target()).toBeInstanceOf(ActivityNodeFork);
                if (!expectedIds.some(e => id.includes(e))) {
                    throw new Error(`${id} is not in the list of expected ids: ${expectedIds}`);
                }
            }
        }
    },
    nodeByLabel: {
        title: 'semantically by using a label',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel('Push', TaskManual);

            const label = await task.label;
            expect(label).toBe('Push');
        }
    },
    nodeByInvalidLabel: {
        title: 'semantically by using a label and throw an error on invalid labels',
        run: async workflow => {
            await expect(workflow.app.graph.getNodeByLabel('Not Existing', TaskManual)).rejects.toThrow();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineGraphSuite}. */
export type GraphSuiteOptions = WorkflowSuiteOptions<typeof graphSuiteCases>;

/**
 * Registers the reusable graph suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineGraphSuite(test: WorkflowTest, options?: GraphSuiteOptions): void {
    test.describe('The graph', () => {
        const suite = workflowSuite(test, 'graph', graphSuiteCases, options);

        test.describe('should allow accessing the edge', () => {
            test(...suite.args('edgeBySelector'));
            test(...suite.args('edgeBySourceType'));
            test(...suite.args('edgeBySourceSelector'));
            test(...suite.args('edgesBySourceType'));
            test(...suite.args('edgesByTargetType'));
            test(...suite.args('edgesBySourceAndTargetType'));
        });

        test.describe('should allow accessing the node', () => {
            test(...suite.args('nodeByLabel'));
            test(...suite.args('nodeByInvalidLabel'));
        });

        suite.done();
    });
}
