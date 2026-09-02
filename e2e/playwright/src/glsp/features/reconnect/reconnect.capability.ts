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
import { SVGMetadata, type PEdge, type PNode } from '../../graph';
import type { ConstructorA } from '../../../types';
import { expect } from '../../../test';
import { assertIsDefined } from '../../../utils';
import { RoutingPointCapability, type RoutingPoint, type RoutingPointKind } from '../routing';

/**
 * Elements can be resized by using the resize handles.
 */
export interface ReconnectCapability {
    reconnectSource(node: PNode & Clickable): Promise<void>;
    reconnectTarget(node: PNode & Clickable): Promise<void>;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link ReconnectCapability}.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link ReconnectCapability}
 */
export function useReconnectCapability<TBase extends ConstructorA<PEdge & Clickable & RoutingPointCapability>>(
    Base: TBase
): Capability<TBase, ReconnectCapability> {
    abstract class Mixin extends Base implements ReconnectCapability {
        async reconnectSource(node: PNode & Clickable): Promise<void> {
            await this.reconnect(node, 'source');
            await expect(this.locate()).toHaveAttribute(SVGMetadata.Edge.sourceId, await node.idAttr());
        }

        async reconnectTarget(node: PNode & Clickable): Promise<void> {
            await this.reconnect(node, 'target');
            await expect(this.locate()).toHaveAttribute(SVGMetadata.Edge.targetId, await node.idAttr());
        }

        protected async reconnect(node: PNode & Clickable, dataKind: RoutingPointKind): Promise<void> {
            const routingPoints = this.routingPoints();
            await routingPoints.enable();
            let point: RoutingPoint | undefined;
            if (dataKind === 'source') {
                point = await routingPoints.sourceHandle();
            } else if (dataKind === 'target') {
                point = await routingPoints.targetHandle();
            }

            assertIsDefined(point, `Routing point of kind ${dataKind} not found`);

            await point.dragTo(node.locate(), { force: true });
            await node.click();
            await expect(node).toBeSelected();
        }
    }

    return Mixin;
}
