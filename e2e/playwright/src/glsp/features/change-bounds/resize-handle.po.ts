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
import { AutoPrepareOptions, AutoWaitOptions, Clickable, Mix, useDraggableFlow } from '../../../extension';
import { ModelElementMetadata, PMetadata, PNode, SVGMetadata } from '../../graph';
import { GLSPLocator, Locateable } from '../../../remote';
import type { Position } from '../../../types';

type Vertical = 'top' | 'bottom';
type Horizontal = 'left' | 'right';

export type ResizeHandleKind = `${Vertical}-${Horizontal}`;

export class ResizeHandles {
    constructor(public readonly element: PNode & Clickable) {}

    protected async autoWait(handle: ResizeHandle, options?: AutoWaitOptions): Promise<void> {
        if (options?.wait === false) {
            return;
        }

        await handle.locate().waitFor({ state: 'visible', timeout: options?.timeout });
    }

    async waitForKind(kind: ResizeHandleKind, options?: AutoWaitOptions): Promise<ResizeHandle> {
        const resizeHandle = new ResizeHandle(
            this.element.locator.child(`[${SVGMetadata.type}="${PMetadata.getType(ResizeHandle)}"][data-kind="${kind}"]`),
            this,
            kind
        );

        await this.autoWait(resizeHandle, options);

        return resizeHandle;
    }

    async ofKind(kind: ResizeHandleKind, options: AutoWaitOptions = { wait: false }): Promise<ResizeHandle> {
        return this.waitForKind(kind, options);
    }
}

const ResizeHandleMixin = Mix(Locateable).flow(useDraggableFlow).build();
@ModelElementMetadata({
    type: 'resize-handle'
})
export class ResizeHandle extends ResizeHandleMixin {
    constructor(
        locator: GLSPLocator,
        public readonly resizeHandles: ResizeHandles,
        public readonly kind: ResizeHandleKind
    ) {
        super(locator);
    }

    protected async autoPrepare(options?: AutoPrepareOptions): Promise<void> {
        if (options?.prepare === false) {
            return;
        }

        if (await this.isHidden()) {
            await this.resizeHandles.element.click();
            await this.waitForVisible(options?.timeout);
        }
    }

    override async dragToAbsolutePosition(position: Position, options?: AutoPrepareOptions): Promise<void> {
        await this.autoPrepare(options);

        await super.dragToAbsolutePosition(position);
        await this.resizeHandles.element.graph.focus();
        await this.waitForHidden();
    }

    override async dragToRelativePosition(position: Position, options?: AutoPrepareOptions): Promise<void> {
        await this.autoPrepare(options);

        await super.dragToRelativePosition(position);
        await this.resizeHandles.element.graph.focus();
        await this.waitForHidden();
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
        await this.autoPrepare(options);

        await this.dragTo(target, options);
        await this.resizeHandles.element.graph.focus();
    }
}
