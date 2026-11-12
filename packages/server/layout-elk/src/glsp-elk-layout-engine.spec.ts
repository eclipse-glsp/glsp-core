/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
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
import { DefaultModelState, GEdge, GGraph, GLabel, GModelIndex, GNode, GPort, LayoutEngine, ModelState } from '@eclipse-glsp/server';
import { Container, ContainerModule } from 'inversify';
import { describe, expect, it } from 'vitest';
import { ElkLayoutModule } from './di.config';

function createEngine(root: GGraph): { engine: LayoutEngine; modelState: ModelState } {
    const modelState = new DefaultModelState();
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    modelState.updateRoot(root);
    const container = new Container();
    container.load(
        new ContainerModule(bind => bind(ModelState).toConstantValue(modelState)),
        new ElkLayoutModule({ algorithms: ['layered'] })
    );
    return { engine: container.get<LayoutEngine>(LayoutEngine), modelState };
}

/** Two stacked nodes connected by an edge; the layered algorithm places the target to the right of the source. */
function createTwoNodeGraph(): GGraph {
    const source = GNode.builder().id('source').position(0, 0).size(50, 30).build();
    const target = GNode.builder().id('target').position(0, 0).size(50, 30).build();
    const edge = GEdge.builder().id('edge').source(source).target(target).build();
    return GGraph.builder().id('graph').addChildren(source, target, edge).build();
}

/**
 * A source node with edges to an upper and a lower node; the layered algorithm aligns the source with the upper node, so
 * only the edge to the lower node bends.
 */
function createForkGraph(): GGraph {
    const source = GNode.builder().id('source').size(50, 30).build();
    const upper = GNode.builder().id('upper').size(50, 30).build();
    const lower = GNode.builder().id('lower').size(50, 30).build();
    const toUpper = GEdge.builder().id('toUpper').source(source).target(upper).build();
    const toLower = GEdge.builder().id('toLower').source(source).target(lower).build();
    return GGraph.builder().id('graph').addChildren(source, upper, lower, toUpper, toLower).build();
}

/** Two connected nodes with a label on a node, on a port and on the edge; all labels start at the origin. */
function createLabeledGraph(): GGraph {
    const portLabel = GLabel.builder().id('portLabel').text('out').position(0, 0).size(20, 10).build();
    const out = GPort.builder().id('out').size(10, 10).add(portLabel).build();
    const sourceLabel = GLabel.builder().id('sourceLabel').text('Source').position(0, 0).size(40, 10).build();
    const source = GNode.builder().id('source').size(50, 30).addChildren(sourceLabel, out).build();
    const target = GNode.builder().id('target').size(50, 30).build();
    const edgeLabel = GLabel.builder().id('edgeLabel').text('flows').position(0, 0).size(30, 10).build();
    const edge = GEdge.builder().id('edge').sourceId('out').targetId('target').add(edgeLabel).build();
    return GGraph.builder().id('graph').addChildren(source, target, edge).build();
}

describe('GlspElkLayoutEngine', () => {
    describe('computeLayout', () => {
        it('computes new bounds for nodes without changing the graphical model', async () => {
            const { engine, modelState } = createEngine(createTwoNodeGraph());

            const result = await engine.computeLayout!();

            const source = result.bounds.find(bounds => bounds.elementId === 'source')!;
            const target = result.bounds.find(bounds => bounds.elementId === 'target')!;
            expect(source.newSize).toEqual({ width: 50, height: 30 });
            expect(target.newSize).toEqual({ width: 50, height: 30 });
            expect(target.newPosition!.x).toBeGreaterThanOrEqual(source.newPosition!.x + 50);
            expect(modelState.index.findByClass('source', GNode)!.position).toEqual({ x: 0, y: 0 });
            expect(modelState.index.findByClass('target', GNode)!.position).toEqual({ x: 0, y: 0 });
        });

        it('computes new bounds for ports', async () => {
            const port = GPort.builder().id('port').position(0, 0).size(10, 10).build();
            const node = GNode.builder().id('node').position(0, 0).size(50, 30).add(port).build();
            const { engine } = createEngine(GGraph.builder().id('graph').add(node).build());

            const result = await engine.computeLayout!();

            const portBounds = result.bounds.find(bounds => bounds.elementId === 'port');
            expect(portBounds?.newSize).toEqual({ width: 10, height: 10 });
            expect(portBounds?.newPosition).toBeDefined();
        });

        it('computes empty routing points for a straight edge', async () => {
            const { engine } = createEngine(createTwoNodeGraph());

            const result = await engine.computeLayout!();

            expect(result.routingPoints).toEqual([{ elementId: 'edge', newRoutingPoints: [] }]);
        });

        it('computes only the bend points of a bent edge as routing points', async () => {
            const { engine } = createEngine(createForkGraph());

            const result = await engine.computeLayout!();

            // The source point lies on the source's right border and the target point on the target's left border,
            // so every bend point of the orthogonal route lies strictly between them.
            const sourceBounds = result.bounds.find(bounds => bounds.elementId === 'source')!;
            const lowerBounds = result.bounds.find(bounds => bounds.elementId === 'lower')!;
            const routingPoints = result.routingPoints.find(points => points.elementId === 'toLower')!.newRoutingPoints!;
            expect(routingPoints.length).toBeGreaterThan(0);
            for (const point of routingPoints) {
                expect(point.x).toBeGreaterThan(sourceBounds.newPosition!.x + 50);
                expect(point.x).toBeLessThan(lowerBounds.newPosition!.x);
            }
        });
    });

    describe('computeLayout with labels', () => {
        it('computes new bounds for node, port and edge labels without changing the graphical model', async () => {
            const { engine, modelState } = createEngine(createLabeledGraph());

            const result = await engine.computeLayout!();

            for (const [id, size] of [
                ['sourceLabel', { width: 40, height: 10 }],
                ['portLabel', { width: 20, height: 10 }],
                ['edgeLabel', { width: 30, height: 10 }]
            ] as const) {
                const labelBounds = result.bounds.find(bounds => bounds.elementId === id);
                expect(labelBounds?.newSize, id).toEqual(size);
                expect(labelBounds?.newPosition, id).toBeDefined();
                expect(modelState.index.findByClass(id, GLabel)!.position, id).toEqual({ x: 0, y: 0 });
            }
        });
    });

    describe('computeLayout with ports', () => {
        it('routes an edge that starts at a port', async () => {
            const out = GPort.builder().id('out').size(10, 10).build();
            const source = GNode.builder().id('source').size(50, 30).add(out).build();
            const target = GNode.builder().id('target').size(50, 30).build();
            const edge = GEdge.builder().id('edge').sourceId('out').targetId('target').build();
            const { engine } = createEngine(GGraph.builder().id('graph').addChildren(source, target, edge).build());

            const result = await engine.computeLayout!();

            expect(result.routingPoints.map(points => points.elementId)).toEqual(['edge']);
        });
    });

    describe('layout', () => {
        it('applies the same label bounds that computeLayout computes', async () => {
            const { engine, modelState } = createEngine(createLabeledGraph());
            const result = await engine.computeLayout!();

            await engine.layout();

            for (const id of ['sourceLabel', 'portLabel', 'edgeLabel']) {
                const labelBounds = result.bounds.find(bounds => bounds.elementId === id)!;
                const label = modelState.index.findByClass(id, GLabel)!;
                expect(label.position, id).toEqual(labelBounds.newPosition);
                expect(label.size, id).toEqual(labelBounds.newSize);
            }
        });

        it('applies only the bend points of a bent edge as routing points to the graphical model', async () => {
            const { engine, modelState } = createEngine(createForkGraph());

            await engine.layout();

            const source = modelState.index.findByClass('source', GNode)!;
            const lower = modelState.index.findByClass('lower', GNode)!;
            const routingPoints = modelState.index.findByClass('toLower', GEdge)!.routingPoints;
            expect(routingPoints.length).toBeGreaterThan(0);
            for (const point of routingPoints) {
                expect(point.x).toBeGreaterThan(source.position.x + 50);
                expect(point.x).toBeLessThan(lower.position.x);
            }
        });
    });
});
