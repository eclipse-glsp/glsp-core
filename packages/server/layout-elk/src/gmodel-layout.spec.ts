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
import { GEdge, GGraph, GNode, GPort, LayoutOperation, UndoAction } from '@eclipse-glsp/server';
import { describe, expect, it } from 'vitest';
import { createGModelDiagramSession } from './test/diagram-session';

/** Two overlapping nodes; the outgoing port of the first one is connected to the second one by an edge with a stale bend point. */
function createOverlappingGraph(): GGraph {
    const out = GPort.builder().id('out').position(0, 0).size(10, 10).build();
    const draft = GNode.builder().id('draft').position(0, 0).size(50, 30).add(out).build();
    const review = GNode.builder().id('review').position(0, 0).size(50, 30).build();
    const edge = GEdge.builder().id('edge').sourceId('out').targetId('review').addRoutingPoint(500, 500).build();
    return GGraph.builder().id('graph').addChildren(draft, review, edge).build();
}

describe('Layout of a GModel language', () => {
    it('persists the layout of nodes, ports and edges in the graphical model', async () => {
        const session = await createGModelDiagramSession(createOverlappingGraph());

        await session.dispatch(LayoutOperation.create());

        const index = session.modelState.index;
        const draft = index.findByClass('draft', GNode)!;
        const review = index.findByClass('review', GNode)!;
        expect(review.position.x).toBeGreaterThanOrEqual(draft.position.x + 50);
        // in a left-to-right layout, an outgoing port is placed on the right border of its node
        expect(index.findByClass('out', GPort)!.position.x).toBeGreaterThanOrEqual(50 - 10);
        expect(index.findByClass('edge', GEdge)!.routingPoints).toEqual([]);
    });

    it('does not create a command when laying out an already laid out diagram', async () => {
        const session = await createGModelDiagramSession(createOverlappingGraph());
        await session.dispatch(LayoutOperation.create());

        await session.dispatch(LayoutOperation.create());
        await session.dispatch(UndoAction.create());

        // the single undo reverts the first layout, so the second one did not add a command
        expect(session.modelState.index.findByClass('review', GNode)!.position).toEqual({ x: 0, y: 0 });
        expect(session.commandStack.canUndo()).toBe(false);
    });
});
