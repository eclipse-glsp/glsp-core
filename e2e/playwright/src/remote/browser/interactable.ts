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
import type { Locator, Page } from '@playwright/test';
import { assertIsDefined } from '../../utils/ts.utils';
import { BoundingBox, Position } from '../../types';

type Vertical = 'top' | 'middle' | 'bottom';
type Horizontal = 'left' | 'center' | 'right';

export type PositionPlace = `${Vertical}_${Horizontal}`;

/**
 * Returns the interactable version of the bounding box of the element.
 *
 * @param locator Locator of the element
 * @returns Interactable bounding box of element
 */
export async function interactableBoundsOf(locator: Locator): Promise<InteractableBoundingBox> {
    const box = await locator.boundingBox();
    assertIsDefined(box);
    return new InteractableBoundingBox(locator.page(), box);
}

/**
 * The default {@link BoundingBox} only provides information about the position and size.
 * The {@link InteractableBoundingBox} of the element allows further interaction possibilities
 * with the position and size.
 *
 * **Usage**
 *
 * ```ts
 * const box = interactableBoundsOf(page.locator(...));
 * ```
 */
export class InteractableBoundingBox {
    constructor(
        public readonly page: Page,
        public readonly data: BoundingBox
    ) {}

    /**
     * Returns the {@link InteractablePosition} of the provided parameter.
     * The {@link InteractablePosition} allows further interaction possibilities.
     *
     * **Details**
     *
     * The {@link PositionPlace} provides different possible locations.
     * The returned position changes based on the parameter.
     *
     * @param place Enum of for the location
     * @returns Interactable position of the provided place
     */
    position(place: PositionPlace): InteractablePosition {
        switch (place) {
            case 'top_left': {
                return new InteractablePosition(this.page, {
                    x: this.data.x,
                    y: this.data.y
                });
            }
            case 'top_center': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width / 2,
                    y: this.data.y
                });
            }
            case 'top_right': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width,
                    y: this.data.y
                });
            }
            case 'middle_left': {
                return new InteractablePosition(this.page, {
                    x: this.data.x,
                    y: this.data.y + this.data.height / 2
                });
            }
            case 'middle_center': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width / 2,
                    y: this.data.y + this.data.height / 2
                });
            }
            case 'middle_right': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width,
                    y: this.data.y + this.data.height / 2
                });
            }
            case 'bottom_left': {
                return new InteractablePosition(this.page, {
                    x: this.data.x,
                    y: this.data.y + this.data.height
                });
            }
            case 'bottom_center': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width / 2,
                    y: this.data.y + this.data.height
                });
            }
            case 'bottom_right': {
                return new InteractablePosition(this.page, {
                    x: this.data.x + this.data.width,
                    y: this.data.y + this.data.height
                });
            }
        }
    }
}

/**
 * The default {@link Position} only provides information about the x and y coordinates.
 * The {@link InteractablePosition} of the element allows further interaction possibilities
 * with the coordinates.
 */
export class InteractablePosition {
    constructor(
        public readonly page: Page,
        public readonly data: Position
    ) {}

    /**
     * Moves the current coordinates based on the provided coordinates and returns
     * a new {@link InteractablePosition}.
     *
     * @param x Amount to add to the x coordinate
     * @param y Amount to add to the y coordinate
     * @returns New InteractablePosition with the moved coordinates
     */
    moveRelative(x: number, y: number): InteractablePosition {
        return new InteractablePosition(this.page, {
            x: this.data.x + x,
            y: this.data.y + y
        });
    }

    async click(): Promise<void> {
        await this.page.mouse.click(this.data.x, this.data.y);
    }

    async move(): Promise<void> {
        await this.page.mouse.move(this.data.x, this.data.y);
    }
}
