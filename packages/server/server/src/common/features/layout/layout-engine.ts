/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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

import { GModelRoot } from '@eclipse-glsp/graph';
import { ElementAndBounds, ElementAndRoutingPoints, LayoutOperation, MaybePromise } from '@eclipse-glsp/protocol';

/**
 * The positions, sizes, and routing points computed by a {@link LayoutEngine}, before they are applied to any model.
 *
 * The entries use the payload types of `ChangeBoundsOperation` and `ChangeRoutingPointsOperation`, so a layout result
 * can be persisted through the same operation handlers that persist a manual move.
 */
export interface LayoutResult {
    /** The new bounds of every shape the engine placed. */
    bounds: ElementAndBounds[];
    /**
     * The new routing points of every edge the engine routed. Routing points are the bend points of an edge only; a
     * straight edge has an empty list.
     */
    routingPoints: ElementAndRoutingPoints[];
}

/**
 * A layout engine is able to compute layout information for a model.
 */
export interface LayoutEngine {
    /**
     * Computes a layout for the model state and modify the model accordingly.
     * @param operation the operation that triggered this layout
     * @returns the layouted {@link GModelRoot}.
     */
    layout(operation?: LayoutOperation): MaybePromise<GModelRoot>;

    /**
     * Computes a layout for the model state without modifying any model.
     *
     * Engines that implement this method let the `LayoutOperationHandler` persist the layout through the diagram
     * language's operation handlers, which is required for diagram languages with a custom source model. Engines that
     * only implement {@link LayoutEngine.layout} keep the transient behavior, where the layout is lost as soon as the
     * graphical model is derived again from the source model.
     * @param operation the operation that triggered this layout
     * @returns the computed {@link LayoutResult}.
     */
    computeLayout?(operation?: LayoutOperation): MaybePromise<LayoutResult>;
}

export const LayoutEngine = Symbol('LayoutEngine');
