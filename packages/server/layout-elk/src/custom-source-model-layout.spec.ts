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
import { GModelRoot, GNode, LayoutEngine, LayoutOperation, ModelState, RedoAction, UndoAction } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { FlowIds, FlowSourceModel } from './test/flow-diagram';
import { createFlowDiagramSession } from './test/diagram-session';

/** Two overlapping steps connected by a flow with a stale bend point. */
function createOverlappingFlow(): FlowSourceModel {
    return {
        steps: [
            { name: 'Draft', shape: { x: 0, y: 0, width: 50, height: 30 }, ports: [] },
            { name: 'Review', shape: { x: 0, y: 0, width: 50, height: 30 }, ports: [] }
        ],
        flows: [{ from: 'Draft', to: 'Review', via: [{ x: 500, y: 500 }] }]
    };
}

/** A layout engine that predates `computeLayout` and moves every node directly in the graphical model. */
@injectable()
class TransientLayoutEngine implements LayoutEngine {
    @inject(ModelState)
    protected modelState: ModelState;

    layout(): GModelRoot {
        this.modelState.index.getAllByClass(GNode).forEach((node, i) => (node.position = { x: i * 100, y: 0 }));
        return this.modelState.root;
    }
}

describe('Layout of a diagram language with a custom source model', () => {
    it('persists the layout in the source model', async () => {
        const session = await createFlowDiagramSession(createOverlappingFlow());

        await session.dispatch(LayoutOperation.create());

        const [draft, review] = session.modelState.sourceModel.steps;
        expect(review.shape.x).toBeGreaterThanOrEqual(draft.shape.x + 50);
        expect(session.modelState.sourceModel.flows[0].via).toEqual([]);
        // the graphical model is derived again from the source model after the layout, so it shows the persisted layout
        expect(session.modelState.index.findByClass(FlowIds.step('Review'), GNode)!.position).toEqual({
            x: review.shape.x,
            y: review.shape.y
        });
    });

    it('undoes the layout in a single step and redoes it', async () => {
        const session = await createFlowDiagramSession(createOverlappingFlow());
        await session.dispatch(LayoutOperation.create());
        const laidOut = structuredClone(session.modelState.sourceModel);

        await session.dispatch(UndoAction.create());

        expect(session.modelState.sourceModel).toEqual(createOverlappingFlow());
        expect(session.commandStack.canUndo()).toBe(false);

        await session.dispatch(RedoAction.create());

        expect(session.modelState.sourceModel).toEqual(laidOut);
    });

    it('persists only the bounds if the language does not persist routing points', async () => {
        const session = await createFlowDiagramSession(createOverlappingFlow(), { changeRoutingPoints: false });

        await session.dispatch(LayoutOperation.create());

        const [draft, review] = session.modelState.sourceModel.steps;
        expect(review.shape.x).toBeGreaterThanOrEqual(draft.shape.x + 50);
        expect(session.modelState.sourceModel.flows[0].via).toEqual([{ x: 500, y: 500 }]);
    });

    it('does not change the diagram and warns if the language does not persist bounds', async () => {
        const session = await createFlowDiagramSession(createOverlappingFlow(), { changeBounds: false });

        await session.dispatch(LayoutOperation.create());

        expect(session.modelState.sourceModel).toEqual(createOverlappingFlow());
        expect(session.commandStack.isDirty).toBe(false);
        expect(session.warnings).toEqual([expect.stringContaining('ChangeBoundsOperation')]);
    });

    it('keeps the transient layout and informs about it if the layout engine cannot compute a layout result', async () => {
        const session = await createFlowDiagramSession(createOverlappingFlow(), { layoutEngine: TransientLayoutEngine });

        await session.dispatch(LayoutOperation.create());

        expect(session.modelState.sourceModel).toEqual(createOverlappingFlow());
        expect(session.infos).toEqual([expect.stringContaining('computeLayout')]);
    });
});
