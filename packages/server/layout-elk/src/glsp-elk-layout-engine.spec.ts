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
import {
    DefaultModelState,
    GEdge,
    GGraph,
    GLabel,
    GModelElement,
    GModelIndex,
    GNode,
    GPort,
    LayoutEngine,
    LayoutOperation,
    LayoutResult,
    ModelState,
    Point
} from '@eclipse-glsp/server';
import { LayoutOptions } from 'elkjs';
import { Container, ContainerModule, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { ElkLayoutModule, ElkModuleOptions } from './di.config';
import { AbstractLayoutConfigurator, LayoutConfigurator } from './layout-configurator';

function createEngine(
    root: GGraph,
    layoutConfigurator?: ElkModuleOptions['layoutConfigurator']
): { engine: LayoutEngine; modelState: ModelState; layoutConfigurator: LayoutConfigurator } {
    const modelState = new DefaultModelState();
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    modelState.updateRoot(root);
    const container = new Container();
    container.load(
        new ContainerModule(bind => bind(ModelState).toConstantValue(modelState)),
        new ElkLayoutModule({ algorithms: ['layered'], layoutConfigurator })
    );
    return {
        engine: container.get<LayoutEngine>(LayoutEngine),
        modelState,
        layoutConfigurator: container.get<LayoutConfigurator>(LayoutConfigurator)
    };
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

/** Lays out the graph top-down while elements are selected, and left-to-right otherwise. */
@injectable()
class SelectionAwareLayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph, operation?: LayoutOperation): LayoutOptions {
        return { 'elk.direction': operation?.elementIds?.length ? 'DOWN' : 'RIGHT' };
    }
}

/** Records the layout operation that each element was configured with. */
@injectable()
class RecordingLayoutConfigurator implements LayoutConfigurator {
    readonly operations = new Map<string, LayoutOperation | undefined>();

    apply(element: GModelElement, operation?: LayoutOperation): LayoutOptions | undefined {
        this.operations.set(element.id, operation);
        return undefined;
    }
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

    describe('computeLayout with a layout operation', () => {
        it('lets the layout configurator use the selected elements of the layout operation', async () => {
            const { engine } = createEngine(createTwoNodeGraph(), SelectionAwareLayoutConfigurator);

            const unselected = await engine.computeLayout!();
            const selected = await engine.computeLayout!(LayoutOperation.create(['target']));

            const position = (result: LayoutResult, id: string): Point =>
                result.bounds.find(bounds => bounds.elementId === id)!.newPosition!;
            expect(position(unselected, 'target').x).toBeGreaterThanOrEqual(position(unselected, 'source').x + 50);
            expect(position(selected, 'target').y).toBeGreaterThanOrEqual(position(selected, 'source').y + 30);
        });

        it('passes the layout operation to the layout configurator for every element', async () => {
            const label = GLabel.builder().id('label').text('label').size(20, 10).build();
            const port = GPort.builder().id('port').size(10, 10).build();
            const node = GNode.builder().id('node').size(50, 30).add(label).add(port).build();
            const other = GNode.builder().id('other').size(50, 30).build();
            const edge = GEdge.builder().id('edge').source(node).target(other).build();
            const { engine, layoutConfigurator } = createEngine(
                GGraph.builder().id('graph').addChildren(node, other, edge).build(),
                RecordingLayoutConfigurator
            );
            const operation = LayoutOperation.create(['node']);

            await engine.computeLayout!(operation);

            const { operations } = layoutConfigurator as RecordingLayoutConfigurator;
            expect([...operations.keys()].sort()).toEqual(['edge', 'graph', 'label', 'node', 'other', 'port']);
            for (const recorded of operations.values()) {
                expect(recorded?.elementIds).toEqual(['node']);
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
