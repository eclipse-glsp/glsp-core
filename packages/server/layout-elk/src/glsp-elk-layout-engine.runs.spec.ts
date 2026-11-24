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
import { GEdge, GGraph, GLabel, GModelElement, GModelRoot, GNode, GPort, LayoutOperation } from '@eclipse-glsp/server';
import { LayoutOptions } from 'elkjs';
import { injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { AbstractLayoutConfigurator, LayoutConfigurator } from './layout-configurator';
import { boundsOf, createEngine } from './test/layout-engine';

/** A root that is not a {@link GGraph}, with a node at (10,20). */
function createNonGraphRoot(): GModelRoot {
    const node = GNode.builder().id('node').position(10, 20).size(50, 30).build();
    return GModelRoot.builder().type('root').id('root').add(node).build();
}

/** Two connected nodes at (10,20) and (100,20). */
function createTwoNodeGraph(): GGraph {
    const source = GNode.builder().id('source').position(10, 20).size(50, 30).build();
    const target = GNode.builder().id('target').position(100, 20).size(50, 30).build();
    const edge = GEdge.builder().id('edge').source(source).target(target).build();
    return GGraph.builder().id('graph').addChildren(source, target, edge).build();
}

/** Records the layout operation of every call, in order. */
@injectable()
class RecordingLayoutConfigurator implements LayoutConfigurator {
    readonly operations: (LayoutOperation | undefined)[] = [];

    apply(_element: GModelElement, operation?: LayoutOperation): LayoutOptions | undefined {
        this.operations.push(operation);
        return undefined;
    }
}

/** Puts every port on the north side of its node, and sets one more option for edges and labels. */
@injectable()
class NorthPortsConfigurator extends AbstractLayoutConfigurator {
    protected override nodeOptions(): LayoutOptions {
        return { 'elk.portConstraints': 'FIXED_SIDE' };
    }

    protected override portOptions(): LayoutOptions {
        return { 'elk.port.side': 'NORTH' };
    }

    protected override edgeOptions(): LayoutOptions {
        return { 'elk.layered.priority.straightness': '5' };
    }

    protected override labelOptions(): LayoutOptions {
        return { 'elk.edgeLabels.placement': 'HEAD' };
    }
}

describe('GlspElkLayoutEngine runs', () => {
    describe('roots', () => {
        it('returns an empty layout result if the root is not a graph', async () => {
            const { engine, elkInputs } = createEngine(createNonGraphRoot());

            const result = await engine.computeLayout!();

            expect(result).toEqual({ bounds: [], routingPoints: [] });
            expect(elkInputs).toEqual([]);
        });

        it('leaves a root that is not a graph unchanged when laying it out', async () => {
            const root = createNonGraphRoot();
            const { engine } = createEngine(root);

            const laidOut = await engine.layout();

            expect(laidOut).toBe(root);
            expect(root.children[0]).toMatchObject({ position: { x: 10, y: 20 }, size: { width: 50, height: 30 } });
        });
    });

    describe('ELK failures', () => {
        it('rejects if ELK fails and leaves the graphical model unchanged', async () => {
            const root = createTwoNodeGraph();
            const { engine, modelState } = createEngine(root, { defaultLayoutOptions: { 'elk.algorithm': 'unknown' } });

            await expect(engine.layout()).rejects.toThrow(/unknown/);

            expect(modelState.root).toBe(root);
            expect(modelState.index.findByClass('source', GNode)!.position).toEqual({ x: 10, y: 20 });
            expect(modelState.index.findByClass('target', GNode)!.position).toEqual({ x: 100, y: 20 });
            expect(modelState.index.findByClass('edge', GEdge)!.routingPoints).toEqual([]);
        });
    });

    describe('repeated runs', () => {
        it('computes the same layout result on repeated runs', async () => {
            const { engine } = createEngine(createTwoNodeGraph());

            const first = await engine.computeLayout!();
            const second = await engine.computeLayout!();

            expect(second).toEqual(first);
        });

        it('does not carry the edges over to the next run', async () => {
            const { engine, elkInputs } = createEngine(createTwoNodeGraph());

            await engine.computeLayout!();
            const result = await engine.computeLayout!();

            expect(elkInputs.map(input => input.edges?.map(edge => edge.id))).toEqual([['edge'], ['edge']]);
            expect(result.routingPoints.map(points => points.elementId)).toEqual(['edge']);
        });

        it('does not carry the layout operation over to the next run', async () => {
            const { engine, layoutConfigurator } = createEngine(createTwoNodeGraph(), {
                layoutConfigurator: RecordingLayoutConfigurator
            });
            const { operations } = layoutConfigurator as RecordingLayoutConfigurator;
            await engine.computeLayout!(LayoutOperation.create(['source']));
            operations.length = 0;

            await engine.computeLayout!();

            // One call each for the graph, the two nodes and the edge.
            expect(operations).toEqual([undefined, undefined, undefined, undefined]);
        });
    });

    describe('layout options', () => {
        it('passes the node, edge, label and port options of the configurator to ELK', async () => {
            const out = GPort.builder().id('out').size(10, 10).build();
            const source = GNode.builder().id('source').size(50, 30).add(out).build();
            const target = GNode.builder().id('target').size(50, 30).build();
            const label = GLabel.builder().id('label').text('flows').size(30, 10).build();
            const edge = GEdge.builder().id('edge').sourceId('out').targetId('target').add(label).build();
            const graph = GGraph.builder().id('graph').addChildren(source, target, edge).build();
            const { engine, elkInputs } = createEngine(graph, { layoutConfigurator: NorthPortsConfigurator });

            const result = await engine.computeLayout!();

            // Without the options, the layered algorithm would put the port on the source's right (east) border.
            expect(boundsOf(result, 'out')?.newPosition?.y).toBe(-10);
            const [input] = elkInputs;
            const elkSource = input.children!.find(child => child.id === 'source')!;
            expect(elkSource.layoutOptions).toEqual({ 'elk.portConstraints': 'FIXED_SIDE' });
            expect(elkSource.ports![0].layoutOptions).toEqual({ 'elk.port.side': 'NORTH' });
            expect(input.edges![0].layoutOptions).toEqual({ 'elk.layered.priority.straightness': '5' });
            expect(input.edges![0].labels![0].layoutOptions).toEqual({ 'elk.edgeLabels.placement': 'HEAD' });
        });

        it('applies the default layout options of the module even with a custom configurator', async () => {
            // The configurator sets no options at all, so only the ELK instance knows the default direction.
            const { engine, elkInputs } = createEngine(createTwoNodeGraph(), {
                layoutConfigurator: RecordingLayoutConfigurator,
                defaultLayoutOptions: { 'elk.direction': 'DOWN' }
            });

            const result = await engine.computeLayout!();

            expect(elkInputs[0].layoutOptions).toBeUndefined();
            const source = boundsOf(result, 'source')!.newPosition!;
            const target = boundsOf(result, 'target')!.newPosition!;
            expect(target.x).toBe(source.x);
            expect(target.y).toBeGreaterThanOrEqual(source.y + 30);
        });
    });
});
