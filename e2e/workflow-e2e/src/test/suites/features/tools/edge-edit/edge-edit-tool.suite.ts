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
import { expect, PMetadata, VolatileRoutingPoint } from '@eclipse-glsp/playwright';
import { Edge } from '../../../../../graph/elements/edge.po';
import { TaskAutomated } from '../../../../../graph/elements/task-automated.po';
import { TaskManual } from '../../../../../graph/elements/task-manual.po';
import { TaskAutomatedNodes, TaskManualNodes } from '../../../../nodes';
import { workflowSuite, WorkflowSuiteOptions, WorkflowTestCases } from '../../../../suite';
import type { WorkflowTest } from '../../../../workflow-test';

/** Default cases of the reusable edge-edit-tool suite, keyed by stable identifiers. */
export const edgeEditToolSuiteCases = {
    reconnect: {
        title: 'should allow reconnecting edges in the graph',
        run: async workflow => {
            const source = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);
            const newSource = await workflow.app.graph.getNodeByLabel(TaskAutomatedNodes.chktpLabel, TaskAutomated);
            const newTarget = await workflow.app.graph.getNodeByLabel(TaskAutomatedNodes.chkwtLabel, TaskAutomated);

            const edge = await source.edges().outgoingEdgeOfType(Edge);
            await edge.reconnectTarget(newTarget);
            expect(await edge.targetId()).toBe(await newTarget.idAttr());

            await edge.reconnectSource(newSource);
            expect(await edge.sourceId()).toBe(await newSource.idAttr());
        }
    },
    moveRoutingPoints: {
        title: 'should allow moving the routing points in the graph',
        run: async workflow => {
            const source = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            const edge = await source.edges().outgoingEdgeOfType(Edge);
            const routingPoints = edge.routingPoints();
            await routingPoints.enable();
            let points = await routingPoints.points();
            const currentPointsLength = points.length;

            let volatilePoints = await routingPoints.volatilePoints();
            expect(volatilePoints).toHaveLength(1);

            const volatilePoint = volatilePoints[0];
            await workflow.app.graph.waitForReplacement(PMetadata.getType(VolatileRoutingPoint), async () => {
                await volatilePoint.dragToRelativePosition({ x: 50, y: 50 });
            });

            points = await routingPoints.points();
            expect(points).toHaveLength(currentPointsLength + 1);

            volatilePoints = await routingPoints.volatilePoints();
            expect(volatilePoints).toHaveLength(2);
        }
    },
    removeRoutingPointsByRealigning: {
        title: 'should allow removing the routing points in the graph by realigning',
        run: async workflow => {
            const source = await workflow.app.graph.getNodeByLabel(TaskManualNodes.pushLabel, TaskManual);

            const edge = await source.edges().outgoingEdgeOfType(Edge);
            const routingPoints = edge.routingPoints();
            await routingPoints.enable();
            let points = await routingPoints.points();
            const currentPointsLength = points.length;

            let volatilePoints = await routingPoints.volatilePoints();
            expect(volatilePoints).toHaveLength(1);

            // Middle one
            await workflow.app.graph.waitForReplacement(PMetadata.getType(VolatileRoutingPoint), async () => {
                await volatilePoints[0].dragToRelativePosition({ x: 0, y: 50 });
            });

            points = await routingPoints.points();
            expect(points).toHaveLength(currentPointsLength + 1);

            volatilePoints = await routingPoints.volatilePoints();
            expect(volatilePoints).toHaveLength(2);

            // Junction
            const junction = points.find(p => p.lastSnapshot?.kind === 'junction')!;
            await workflow.app.graph.waitForHide(junction.locator, async () => {
                await junction.dragToRelativePosition({ x: 20, y: -40 });
            });

            points = await routingPoints.points();
            expect(points).toHaveLength(currentPointsLength);

            volatilePoints = await routingPoints.volatilePoints();
            expect(volatilePoints).toHaveLength(1);
        }
    }
} satisfies WorkflowTestCases;

/** Integration-specific skips for {@link defineEdgeEditToolSuite}. */
export type EdgeEditToolSuiteOptions = WorkflowSuiteOptions<typeof edgeEditToolSuiteCases>;

/**
 * Registers the reusable edge-edit-tool suite.
 *
 * @param test test instance whose integration should execute the suite
 * @param options integration-specific suite and case skips
 */
export function defineEdgeEditToolSuite(test: WorkflowTest, options?: EdgeEditToolSuiteOptions): void {
    test.describe('The edge edit tool', () => {
        const suite = workflowSuite(test, 'edgeEditTool', edgeEditToolSuiteCases, options);
        test(...suite.args('reconnect'));
        test(...suite.args('moveRoutingPoints'));
        test(...suite.args('removeRoutingPointsByRealigning'));
        suite.done();
    });
}
