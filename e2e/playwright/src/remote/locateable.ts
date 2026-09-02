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
import type { GLSPApp } from '../glsp/app/app.po';
import { InteractableBoundingBox, interactableBoundsOf } from './browser/interactable';
import type { GLSPLocator, LocateContext } from './locator';

/**
 * Root class of all locateable page objects.
 */
export class Locateable {
    constructor(public readonly locator: GLSPLocator) {}

    get app(): GLSPApp {
        return this.locator.app;
    }

    get page(): Page {
        return this.locator.page;
    }

    /**
     * Returns the Playwright {@link Locator}
     */
    locate(context: LocateContext = 'self'): Locator {
        return this.locator.locate(context);
    }

    /**
     * Returns whether the element is hidden.
     *
     * @see {@link Locator.isVisible}
     */
    async isHidden(): Promise<boolean> {
        return this.locate().isHidden();
    }

    /**
     * Returns whether the element is visible.
     *
     * @see {@link Locator.isVisible}
     */
    async isVisible(): Promise<boolean> {
        return this.locate().isVisible();
    }

    /**
     * Returns when element specified by locator satisfies the state option.
     *
     * If target element already satisfies the condition, the method returns immediately.
     * Otherwise, waits for up to timeout milliseconds until the condition is met.
     *
     * @param options
     *
     * @see {@link Locator.waitFor}
     */
    async waitFor(options?: Parameters<Locator['waitFor']>[0]): Promise<void> {
        return this.locate().waitFor(options);
    }

    /**
     * Returns when element specified by locator satisfies the hidden state.
     *
     * If target element already satisfies the condition, the method returns immediately.
     * Otherwise, waits for up to timeout milliseconds until the condition is met.
     *
     * @see {@link Locator.waitFor}
     */
    async waitForHidden(timeout?: number): Promise<void> {
        return this.waitFor({ state: 'hidden', timeout });
    }

    /**
     * Returns when element specified by locator satisfies the visible state.
     *
     * If target element already satisfies the condition, the method returns immediately.
     * Otherwise, waits for up to timeout milliseconds until the condition is met.
     *
     * @see {@link Locator.waitFor}
     */
    async waitForVisible(timeout?: number): Promise<void> {
        return this.waitFor({ state: 'visible', timeout });
    }

    /**
     * Returns the interactable bounding box of the element.
     *
     * @see {@link InteractableBoundingBox}
     */
    async bounds(): Promise<InteractableBoundingBox> {
        return interactableBoundsOf(this.locate());
    }
}
