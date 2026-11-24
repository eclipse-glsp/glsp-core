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
import { GEdge, GLabel } from '@eclipse-glsp/server';
import { LayoutOptions } from 'elkjs';
import { injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { AbstractLayoutConfigurator } from './layout-configurator';
import { boundsOf, createEngine, routingPointsOf } from './test/layout-engine';
import { container, graph, node, port } from './test/layout-graphs';

/** Places the labels of every node centered at the top inside the node. */
@injectable()
class TopCenterLabelConfigurator extends AbstractLayoutConfigurator {
    protected override nodeOptions(): LayoutOptions {
        return { 'elk.nodeLabels.placement': 'INSIDE V_TOP H_CENTER' };
    }
}

describe('GlspElkLayoutEngine graph structure', () => {
    describe('nested nodes', () => {
        it('lays out the child nodes of a node relative to the node and resizes the node to fit them', async () => {
            const first = node('first');
            const second = node('second');
            const edge = GEdge.builder().id('edge').source(first).target(second).build();
            const { engine } = createEngine(graph(container('parent', first, second, edge)));

            const result = await engine.computeLayout!();

            // 12 is the layered algorithm's default padding and 20 its default spacing between layers.
            expect(boundsOf(result, 'first')).toMatchObject({ newPosition: { x: 12, y: 12 }, newSize: { width: 50, height: 30 } });
            expect(boundsOf(result, 'second')).toMatchObject({ newPosition: { x: 82, y: 12 }, newSize: { width: 50, height: 30 } });
            expect(boundsOf(result, 'parent')?.newSize).toEqual({ width: 144, height: 54 });
        });

        it('lays out the labels of a nested node', async () => {
            const label = GLabel.builder().id('label').text('Child').position(0, 0).size(40, 10).build();
            const { engine } = createEngine(graph(container('parent', node('child', label))), {
                layoutConfigurator: TopCenterLabelConfigurator
            });

            const result = await engine.computeLayout!();

            // Centered horizontally in the 50 wide child, and at the top behind the default label padding of 5.
            expect(boundsOf(result, 'label')).toEqual({
                elementId: 'label',
                newPosition: { x: 5, y: 5 },
                newSize: { width: 40, height: 10 }
            });
        });

        it('routes an edge that a node contains inside the node, with routing points relative to the node', async () => {
            const source = node('source');
            const upper = node('upper');
            const lower = node('lower');
            const toUpper = GEdge.builder().id('toUpper').source(source).target(upper).build();
            const toLower = GEdge.builder().id('toLower').source(source).target(lower).build();
            const { engine } = createEngine(graph(container('parent', source, upper, lower, toUpper, toLower)));

            const result = await engine.computeLayout!();

            // The source is aligned with the upper node, so only the edge to the lower node bends, halfway between the
            // layers. Relative to the graph, the bend points would be shifted by the parent's new position (12,12).
            expect(boundsOf(result, 'parent')?.newPosition).toEqual({ x: 12, y: 12 });
            expect(routingPointsOf(result, 'toUpper')).toEqual([]);
            expect(routingPointsOf(result, 'toLower')).toEqual([
                { x: 72, y: 37 },
                { x: 72, y: 77 }
            ]);
        });
    });

    describe('ports', () => {
        it('routes an edge between ports of two sibling nodes', async () => {
            const outPort = port('out');
            const inPort = port('in');
            const edge = GEdge.builder().id('edge').source(outPort).target(inPort).build();
            const { engine } = createEngine(graph(node('source', outPort), node('target', inPort), edge));

            const result = await engine.computeLayout!();

            // The ports are placed relative to their nodes: on the source's right border and on the target's left border.
            expect(boundsOf(result, 'out')?.newPosition).toEqual({ x: 50, y: 10 });
            expect(boundsOf(result, 'in')?.newPosition).toEqual({ x: -10, y: 10 });
            expect(routingPointsOf(result, 'edge')).toEqual([]);
        });

        it('routes an edge from a node to a port', async () => {
            const inPort = port('in');
            const source = node('source');
            const edge = GEdge.builder().id('edge').source(source).target(inPort).build();
            const { engine } = createEngine(graph(source, node('target', inPort), edge));

            const result = await engine.computeLayout!();

            expect(boundsOf(result, 'in')?.newPosition).toEqual({ x: -10, y: 10 });
            expect(boundsOf(result, 'target')?.newPosition?.x).toBeGreaterThan(boundsOf(result, 'source')!.newPosition!.x + 50);
            expect(routingPointsOf(result, 'edge')).toEqual([]);
        });

        it('routes an edge that a port contains', async () => {
            const target = node('target');
            const outPort = port('out', GEdge.builder().id('edge').sourceId('out').target(target).build());
            const { engine } = createEngine(graph(node('source', outPort), target));

            const result = await engine.computeLayout!();

            expect(boundsOf(result, 'out')?.newPosition).toEqual({ x: 50, y: 10 });
            expect(routingPointsOf(result, 'edge')).toEqual([]);
        });
    });

    describe('self-loops', () => {
        it('routes a self-loop around its node', async () => {
            const loop = node('loop');
            const edge = GEdge.builder().id('edge').source(loop).target(loop).build();
            const { engine } = createEngine(graph(loop, edge));

            const result = await engine.computeLayout!();

            const { x, y } = boundsOf(result, 'loop')!.newPosition!;
            const routingPoints = routingPointsOf(result, 'edge');
            expect(routingPoints).toHaveLength(2);
            for (const point of routingPoints!) {
                const inside = point.x > x && point.x < x + 50 && point.y > y && point.y < y + 30;
                expect(inside, `(${point.x},${point.y}) lies inside the node`).toBe(false);
            }
        });
    });
});
