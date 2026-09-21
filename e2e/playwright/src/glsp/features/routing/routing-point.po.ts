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
import type { Locator } from '@playwright/test';
import type { AutoPrepareOptions, AutoWaitOptions } from '../../../extension';
import { Clickable, Mix, useDraggableFlow } from '../../../extension';
import { ModelElementMetadata, PEdge, PMetadata, PModelElement, PModelElementData, PModelElementSnapshot, SVGMetadata } from '../../graph';
import type { Position } from '../../../types';
import { definedAttr, definedGLSPAttr } from '../../../utils/ts.utils';
import { ClientAttribute } from '../../client-dom';

export type RoutingPointKind = 'junction' | 'line' | 'source' | 'target';

export class RoutingPoints {
    readonly pointsLocator;
    readonly volatilePointsLocator;

    constructor(public readonly element: PEdge & Clickable) {
        this.pointsLocator = this.element.locate().locator(`> [${SVGMetadata.type}='${PMetadata.getType(RoutingPoint)}']`);
        this.volatilePointsLocator = this.element.locate().locator(`> [${SVGMetadata.type}='${PMetadata.getType(VolatileRoutingPoint)}']`);
    }

    protected async autoWait(options?: AutoWaitOptions): Promise<void> {
        if (options?.wait === false) {
            return;
        }

        await this.pointsLocator.nth(0).waitFor({ state: 'visible', timeout: options?.timeout });
        await this.volatilePointsLocator.nth(0).waitFor({ state: 'visible', timeout: options?.timeout });
    }

    async enable(): Promise<void> {
        await this.element.graph.waitForCreation(PMetadata.getType(RoutingPoint), async () => {
            await this.element.click({ dispatch: true });
        });
    }

    async points(options?: AutoWaitOptions): Promise<RoutingPoint[]> {
        await this.autoWait(options);

        const elements: RoutingPoint[] = [];

        for await (const childLocator of await this.pointsLocator.all()) {
            const id = await definedAttr(childLocator, 'id');

            const point = new RoutingPoint({ locator: this.element.locator.child(`id=${id}`), routingPoints: this });
            await point.snapshot();
            elements.push(point);
        }

        return elements;
    }

    async volatilePoints(options?: AutoWaitOptions): Promise<VolatileRoutingPoint[]> {
        await this.autoWait(options);

        const elements: VolatileRoutingPoint[] = [];

        for await (const childLocator of await this.volatilePointsLocator.all()) {
            const id = await definedAttr(childLocator, 'id');

            const point = new VolatileRoutingPoint({
                locator: this.element.locator.child(`id=${id}`),
                routingPoints: this
            });
            await point.snapshot();
            elements.push(point);
        }

        return elements;
    }

    async sourceHandle(options?: AutoWaitOptions): Promise<RoutingPoint | undefined> {
        const routingPoints = await this.points(options);
        for (const point of routingPoints) {
            if ((await point.dataKindAttr()) === 'source') {
                return point;
            }
        }

        return undefined;
    }

    async targetHandle(options?: AutoWaitOptions): Promise<RoutingPoint | undefined> {
        const routingPoints = await this.points(options);
        for (const point of routingPoints) {
            if ((await point.dataKindAttr()) === 'target') {
                return point;
            }
        }

        return undefined;
    }
}

export interface RoutingPointSnapshot extends PModelElementSnapshot {
    kind: RoutingPointKind;
}

export interface BaseRoutingPointData extends PModelElementData {
    routingPoints: RoutingPoints;
}

const BaseRoutingPointMixin = Mix(PModelElement).flow(useDraggableFlow).build();
export abstract class BaseRoutingPoint extends BaseRoutingPointMixin {
    readonly routingPoints;
    override lastSnapshot?: RoutingPointSnapshot | undefined;

    constructor(data: BaseRoutingPointData) {
        super(data);

        this.routingPoints = data.routingPoints;
    }

    override async snapshot(): Promise<RoutingPointSnapshot> {
        this.lastSnapshot = {
            snapshotTime: new Date().getTime(),
            class: await this.classAttr(),
            id: await this.idAttr(),
            type: await this.typeAttr(),
            kind: await this.dataKindAttr()
        } as RoutingPointSnapshot;

        return this.lastSnapshot;
    }

    protected async autoPrepare(options?: AutoPrepareOptions): Promise<void> {
        if (options?.prepare === false) {
            return;
        }

        if (await this.isHidden()) {
            await this.routingPoints.element.click();
            await this.waitForVisible(options?.timeout);
        }
    }

    async dataKindAttr(): Promise<RoutingPointKind> {
        return (await definedGLSPAttr(this.locator, ClientAttribute.RESIZE_HANDLE_KIND)) as RoutingPointKind;
    }

    override async dragToAbsolutePosition(position: Position, options?: AutoPrepareOptions): Promise<void> {
        await this.autoPrepare(options);

        await super.dragToAbsolutePosition(position);
    }

    override async dragToRelativePosition(position: Position, options?: AutoPrepareOptions): Promise<void> {
        await this.autoPrepare(options);

        await super.dragToRelativePosition(position);
    }

    override async dragTo(
        target: Locator,
        options?: {
            force?: boolean;
            noWaitAfter?: boolean;
            sourcePosition?: { x: number; y: number };
            targetPosition?: { x: number; y: number };
            timeout?: number;
            trial?: boolean;
        } & AutoPrepareOptions
    ): Promise<void> {
        await this.autoPrepare();

        await super.dragTo(target, options);
    }
}

@ModelElementMetadata({
    type: 'routing-point'
})
export class RoutingPoint extends BaseRoutingPoint {
    constructor(data: BaseRoutingPointData) {
        super(data);
    }
}

@ModelElementMetadata({
    type: 'volatile-routing-point'
})
export class VolatileRoutingPoint extends BaseRoutingPoint {
    constructor(data: BaseRoutingPointData) {
        super(data);
    }
}
