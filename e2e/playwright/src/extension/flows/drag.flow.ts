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
import type { Locateable } from '../../remote';
import { addToBoundingBox } from '../../utils/position.utils';
import type { ConstructorA, Position } from '../../types';
import type { Flow } from '../types';

/**
 * Flow for dragging an element.
 */
export interface Draggable {
    /**
     * Drag the element towards the absolute position and drop it.
     *
     * @param position Absolute position to move the element
     */
    dragToAbsolutePosition(position: Position): Promise<void>;

    /**
     * Drag the element towards the relative position based on the element and drop it.
     *
     * @param position Relative position based to the element
     */
    dragToRelativePosition(position: Position): Promise<void>;

    /**
     * Drag the element towards the target element and drop it.
     *
     * @param target Locator of the element to drag to
     * @param options
     *
     * @see {@link Locator.dragTo}
     */
    dragTo(target: Parameters<Locator['dragTo']>[0], options?: Parameters<Locator['dragTo']>[1]): Promise<void>;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link Draggable} flow.
 *
 * **Details**
 *
 * The dragging is done by using the mouse.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link Deletable} flow
 */
export function useDraggableFlow<TBase extends ConstructorA<Locateable>>(Base: TBase): Flow<TBase, Draggable> {
    abstract class Mixin extends Base implements Draggable {
        async dragToAbsolutePosition(position: Position): Promise<void> {
            const mouse = this.locator.page.mouse;
            const bounds = await this.bounds();
            const center = bounds.position('middle_center');

            await mouse.move(center.data.x, center.data.y);
            await mouse.down();
            await mouse.move(position.x, position.y);
            await mouse.up();
        }

        async dragToRelativePosition(position: Position): Promise<void> {
            const mouse = this.locator.page.mouse;
            const bounds = await this.bounds();
            const center = bounds.position('middle_center');

            const target = addToBoundingBox(bounds.data, position);

            await mouse.move(center.data.x, center.data.y);
            await mouse.down();
            await mouse.move(target.x, target.y);
            await mouse.up();
        }

        /**
         * Drag the element towards the target element and drop it.
         *
         * **Details**
         *
         * Proxied to the Playwright {@link Locator} implementation. The method is the same as executing:
         *
         * ```ts
         * page.locator(...).dragTo(target, options);
         * ```
         *
         * @param target Locator of the element to drag to
         * @param options
         *
         * @see {@link Locator.dragTo}
         */
        async dragTo(target: Parameters<Locator['dragTo']>[0], options?: Parameters<Locator['dragTo']>[1]): Promise<void> {
            return this.locate().dragTo(target, options);
        }
    }

    return Mixin;
}
