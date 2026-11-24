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
import { DefaultModelState, GEdge, GGraph, GModelIndex, GNode, GPort, Logger, ModelState, NullLogger } from '@eclipse-glsp/server';
import { Container, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { DefaultElementFilter, ElementFilter } from './element-filter';

/** Records the messages of the warnings logged by the filter. */
class RecordingLogger extends NullLogger {
    readonly warnings: string[] = [];

    override warn(message: string): void {
        this.warnings.push(message);
    }
}

/** Rejects the nodes with the given IDs and keeps everything else, like an adopter's filter that only overrides `filterNode`. */
function createFilter(root: GGraph, ...rejectedNodeIds: string[]): { filter: ElementFilter; logger: RecordingLogger } {
    @injectable()
    class NodeRejectingElementFilter extends DefaultElementFilter {
        protected override filterNode(node: GNode): boolean {
            return !rejectedNodeIds.includes(node.id);
        }
    }
    const modelState = new DefaultModelState();
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    modelState.updateRoot(root);
    const container = new Container();
    const logger = new RecordingLogger();
    container.bind(ModelState).toConstantValue(modelState);
    container.bind(Logger).toConstantValue(logger);
    return { filter: container.resolve(NodeRejectingElementFilter), logger };
}

/**
 * A graph with an `outer` node that contains an `inner` node with a port, and a top-level `source` node with an edge to
 * each of them.
 */
function createNestedGraph(): GGraph {
    const port = GPort.builder().id('port').build();
    const inner = GNode.builder().id('inner').add(port).build();
    const outer = GNode.builder().id('outer').add(inner).build();
    const source = GNode.builder().id('source').build();
    const toOuter = GEdge.builder().id('toOuter').sourceId('source').targetId('outer').build();
    const toInner = GEdge.builder().id('toInner').sourceId('source').targetId('inner').build();
    const toPort = GEdge.builder().id('toPort').sourceId('source').targetId('port').build();
    return GGraph.builder().id('graph').addChildren(outer, source, toOuter, toInner, toPort).build();
}

function keepsEdge(filter: ElementFilter, root: GGraph, id: string): boolean {
    return filter.apply(root.children.find(child => child.id === id)!);
}

describe('DefaultElementFilter', () => {
    describe('apply to an edge', () => {
        it('keeps an edge whose ends and their containers are all kept', () => {
            const root = createNestedGraph();
            const { filter } = createFilter(root);

            expect(['toOuter', 'toInner', 'toPort'].map(id => keepsEdge(filter, root, id))).toEqual([true, true, true]);
        });

        it('rejects an edge to a port of a rejected node', () => {
            const root = createNestedGraph();
            const { filter } = createFilter(root, 'inner');

            expect(keepsEdge(filter, root, 'toPort')).toBe(false);
        });

        it('rejects the edges to the elements inside a rejected node', () => {
            const root = createNestedGraph();
            const { filter } = createFilter(root, 'outer');

            expect(['toOuter', 'toInner', 'toPort'].map(id => keepsEdge(filter, root, id))).toEqual([false, false, false]);
        });

        it('rejects an edge whose end does not exist in the model', () => {
            const source = GNode.builder().id('source').build();
            const dangling = GEdge.builder().id('dangling').sourceId('source').targetId('missing').build();
            const root = GGraph.builder().id('graph').addChildren(source, dangling).build();
            const { filter } = createFilter(root);

            expect(keepsEdge(filter, root, 'dangling')).toBe(false);
        });

        it('warns about an edge whose end does not exist in the model', () => {
            const source = GNode.builder().id('source').build();
            const dangling = GEdge.builder().id('dangling').sourceId('source').targetId('missing').build();
            const root = GGraph.builder().id('graph').addChildren(source, dangling).build();
            const { filter, logger } = createFilter(root);

            keepsEdge(filter, root, 'dangling');

            expect(logger.warnings).toEqual(["Edge 'dangling' is not laid out, because its end 'missing' does not exist in the model"]);
        });
    });
});
