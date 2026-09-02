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
import { TaskManualNodes } from '../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../suite';
import type { WorkflowTest } from '../../workflow-test';

/** Default cases of the reusable connectable-element edge-accessor suite, keyed by stable identifiers. */
export const connectableElementSuiteCases = {
    edgesOfType: {
        title: 'should allow accessing all edges of a type',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const edges = await task.edges().outgoingEdgesOfType(Edge);

            const ids = await Promise.all(edges.map(async e => e.idAttr()));
            const expectedIds = ['edge_task_Push_fork_1'];

            expect(ids.length).toBe(expectedIds.length);
            ids.forEach(id => {
                if (!expectedIds.some(e => id.includes(e))) {
                    throw new Error(`${id} is not in the list of expected ids: ${expectedIds}`);
                }
            });
        }
    },
    typedSources: {
        title: 'should return typed sources on access',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const edges = await task.edges().outgoingEdgesOfType(Edge);
            expect(edges.length).toBe(1);

            const source = await edges[0].source();
            expect(await source.idAttr()).toContain('task_Push');
            expect(source instanceof TaskManual).toBeTruthy();
        }
    },
    edgesOfTypeByTargetType: {
        title: 'should allow accessing all edges of a type against a target type',
        run: async workflow => {
            const task = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const edges = await task.edges().outgoingEdgesOfType(Edge, { targetConstructor: ActivityNodeFork });
            expect(edges.length).toBe(1);

            const source = await edges[0].source();
            expect(await source.idAttr()).toContain('task_Push');
            expect(source instanceof TaskManual).toBeTruthy();

            const target = await edges[0].target();
            expect(await target.idAttr()).toContain('fork_1');
            expect(target instanceof ActivityNodeFork).toBeTruthy();
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineConnectableElementSuite}. */
export type ConnectableElementSuiteOptions = WorkflowSuiteOptions<typeof connectableElementSuiteCases>;

/**
 * Registers the reusable connectable-element edge-accessor suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineConnectableElementSuite(test: WorkflowTest, options?: ConnectableElementSuiteOptions): void {
    test.describe('The edge accessor of a connectable element', () => {
        const suite = workflowSuite(test, 'connectableElement', connectableElementSuiteCases, options);
        test(...suite.args('edgesOfType'));
        test(...suite.args('typedSources'));
        test(...suite.args('edgesOfTypeByTargetType'));
        suite.done();
    });
}
