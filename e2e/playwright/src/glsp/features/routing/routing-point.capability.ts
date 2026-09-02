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
import type { Capability, Clickable } from '../../../extension';
import type { PEdge } from '../../graph';
import type { ConstructorA } from '../../../types';
import { RoutingPoints } from './routing-point.po';

/**
 * An edge may have zero or more routing points that “re-direct” the edge between the source and the target element.
 *
 * [Learn more about routing points](https://www.eclipse.org/glsp/documentation/protocol/).
 */
export interface RoutingPointCapability<TRoutingPoints extends RoutingPoints = RoutingPoints> {
    /**
     * Access the page object of the routing points of the element.
     *
     * @returns Page object of the routing points
     */
    routingPoints(): TRoutingPoints;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link RoutingPointCapability}.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link RoutingPointCapability}
 */
export function useRoutingPointCapability<TBase extends ConstructorA<PEdge & Clickable>>(
    Base: TBase
): Capability<TBase, RoutingPointCapability> {
    abstract class Mixin extends Base implements RoutingPointCapability {
        routingPoints(): RoutingPoints {
            return new RoutingPoints(this);
        }
    }

    return Mixin;
}
