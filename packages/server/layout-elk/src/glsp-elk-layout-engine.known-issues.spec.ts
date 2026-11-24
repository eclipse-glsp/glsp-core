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
import { GCompartment, GEdge, GGraph, GLabel, GNode } from '@eclipse-glsp/server';
import { describe, expect, it } from 'vitest';
import { boundsOf, createEngine, routingPointsOf } from './test/layout-engine';
import { container, edge, graph, node } from './test/layout-graphs';

/*
 * Known issues of the ELK layout engine. Each test asserts the correct behaviour and runs through `knownIssue` until the
 * issue is fixed. A fix makes the test fail, which is the reminder to turn it into an `it`.
 */

/**
 * Runs a test that fails because of a known issue, and checks that it fails for that reason. Unlike `it.fails`, the test
 * doesn't pass if it fails for another reason, e.g. a broken test helper or a changed ELK layout.
 * @param name The name of the test, which describes the correct behaviour.
 * @param reason Matches the message of the error with which the test fails today.
 * @param test Asserts the correct behaviour.
 */
function knownIssue(name: string, reason: RegExp, test: () => Promise<void>): void {
    it(name, () => expect(test()).rejects.toThrow(reason));
}

/**
 * The model of eclipse-glsp/glsp#1820: a `category` node with a `header` and a `struct` compartment, where `struct`
 * contains two connected tasks.
 */
function createCategoryGraph(): GGraph {
    const header = GCompartment.builder().type('comp:header').id('header').position(5, 5).size(100, 30).build();
    const task1 = GNode.builder().id('task1').position(10, 10).size(50, 30).build();
    const task2 = GNode.builder().id('task2').position(100, 10).size(50, 30).build();
    const struct = GCompartment.builder().type('struct').id('struct').position(5, 40).size(200, 60).addChildren(task1, task2).build();
    const category = GNode.builder().id('category').position(100, 100).size(210, 105).addChildren(header, struct).build();
    return graph(category, edge('edge', 'task1', 'task2'));
}

describe('GlspElkLayoutEngine known issues', () => {
    // F1: elkjs keeps the bend points of the input section if the new route has none.
    knownIssue(
        'replaces the bend points of an edge that had bend points before',
        /expected \[ { x: 500, y: 500 } \] to deeply equal \[\]/,
        async () => {
            const bent = GEdge.builder()
                .id('edge')
                .sourceId('source')
                .targetId('target')
                .addRoutingPoint(1, 1)
                .addRoutingPoint(500, 500)
                .addRoutingPoint(9, 9)
                .build();
            const { engine } = createEngine(graph(node('source'), node('target'), bent));

            const result = await engine.computeLayout!();

            // Without routing points in the model, the edge is straight.
            expect(routingPointsOf(result, 'edge')).toEqual([]);
        }
    );

    // F2: the engine places the edge in the parent, which ELK only supports with `elk.hierarchyHandling: INCLUDE_CHILDREN`.
    knownIssue(
        'lays out an edge from a node to its child node',
        /UnsupportedGraphException: The source or the target of edge ElkEdge "edge"/,
        async () => {
            const { engine } = createEngine(graph(container('parent', node('child')), edge('edge', 'parent', 'child')));

            const result = await engine.computeLayout!();

            expect(routingPointsOf(result, 'edge')).toBeDefined();
        }
    );

    // F2
    knownIssue(
        'lays out an edge from a child node to its parent node',
        /UnsupportedGraphException: The source or the target of edge ElkEdge "edge"/,
        async () => {
            const { engine } = createEngine(graph(container('parent', node('child')), edge('edge', 'child', 'parent')));

            const result = await engine.computeLayout!();

            expect(routingPointsOf(result, 'edge')).toBeDefined();
        }
    );

    // F3: the engine passes the edge to ELK, which rejects the whole graph because an edge is no shape.
    knownIssue(
        'lays out the graph if an edge connects to another edge',
        /JsonImportException: Referenced shape does not exist: toB/,
        async () => {
            const { engine } = createEngine(graph(node('a'), node('b'), node('c'), edge('toB', 'a', 'b'), edge('toEdge', 'c', 'toB')));

            const result = await engine.computeLayout!();

            expect(routingPointsOf(result, 'toB')).toBeDefined();
        }
    );

    // F4: the engine leaves the edge out of the layout without logging it.
    knownIssue(
        'reports an edge whose end is a label instead of dropping it silently',
        /expected \[\] to deep equally contain/,
        async () => {
            const label = GLabel.builder().id('label').text('label').position(0, 0).size(10, 10).build();
            const { engine, logger } = createEngine(graph(node('labeled', label), node('source'), edge('edge', 'source', 'label')));

            await engine.computeLayout!();

            expect([...logger.warnings, ...logger.debugMessages]).toContainEqual(expect.stringContaining("'edge'"));
        }
    );

    // F5, eclipse-glsp/glsp#1820 (part 2): the engine finds no common ancestor for the edge and leaves it out silently.
    knownIssue('routes an edge between the children of two different nodes', /expected undefined to be defined/, async () => {
        // ELK can route edges across hierarchy levels with INCLUDE_CHILDREN; the edge is left out without it, too.
        const { engine } = createEngine(graph(container('left', node('x')), container('right', node('y')), edge('edge', 'x', 'y')), {
            defaultLayoutOptions: { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' }
        });

        const result = await engine.computeLayout!();

        expect(routingPointsOf(result, 'edge')).toBeDefined();
    });

    // F6, eclipse-glsp/glsp#1820 (part 1): ELK computes the routing points relative to the node that it places the edge
    // in, and the engine stores them unchanged on an edge whose parent is the graph.
    knownIssue(
        'stores the routing points of an edge relative to the parent of the edge',
        /expected \[ { x: 72, y: 37 }, { x: 72, y: 77 } \] to deeply equal/,
        async () => {
            const parent = container('parent', node('source'), node('upper'), node('lower'));
            const { engine } = createEngine(graph(parent, edge('toUpper', 'source', 'upper'), edge('toLower', 'source', 'lower')));

            const result = await engine.computeLayout!();

            // Relative to the parent, the points are (72,37) and (72,77); see the graph structure spec. The parent is placed at (12,12).
            expect(boundsOf(result, 'parent')?.newPosition).toEqual({ x: 12, y: 12 });
            expect(routingPointsOf(result, 'toLower')).toEqual([
                { x: 84, y: 49 },
                { x: 84, y: 89 }
            ]);
        }
    );

    // F7, eclipse-glsp/glsp#1820 (part 1), eclipse-glsp/glsp#1598: compartments have no counterpart in ELK, so ELK lays
    // out the tasks as direct children of `category` and sizes `category` to fit only them. The positions are applied
    // relative to `struct`, which keeps its bounds and no longer fits into `category`.
    knownIssue(
        'sizes a node to fit its compartments and the nodes inside them',
        /struct: expected \d+ to be less than or equal to \d+/,
        async () => {
            const { engine, modelState } = createEngine(createCategoryGraph());

            await engine.layout();

            const category = modelState.index.findByClass('category', GNode)!;
            const struct = modelState.index.findByClass('struct', GCompartment)!;
            for (const id of ['header', 'struct']) {
                const compartment = modelState.index.findByClass(id, GCompartment)!;
                expect(compartment.position.x + compartment.size.width, id).toBeLessThanOrEqual(category.size.width);
                expect(compartment.position.y + compartment.size.height, id).toBeLessThanOrEqual(category.size.height);
            }
            for (const id of ['task1', 'task2']) {
                const task = modelState.index.findByClass(id, GNode)!;
                expect(struct.position.x + task.position.x + task.size.width, id).toBeLessThanOrEqual(category.size.width);
                expect(struct.position.y + task.position.y + task.size.height, id).toBeLessThanOrEqual(category.size.height);
            }
        }
    );

    // F8: ELK lays out a node without a size as 0x0, and the engine returns that size. Nodes collapse if the layout runs
    // before the client has computed their bounds.
    knownIssue(
        'does not shrink a node without a size to 0x0',
        /source: expected { width: \+0, height: \+0 } to not deeply equal/,
        async () => {
            const source = GNode.builder().id('source').build();
            const target = GNode.builder().id('target').build();
            const { engine } = createEngine(graph(source, target, edge('edge', 'source', 'target')));

            const result = await engine.computeLayout!();

            for (const id of ['source', 'target']) {
                expect(boundsOf(result, id)?.newSize, id).not.toEqual({ width: 0, height: 0 });
            }
        }
    );
});
