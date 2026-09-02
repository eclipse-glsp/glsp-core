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
import type { ConstructorA } from '../../types';
import type { Flow } from '../types';

/**
 * Flow for hovering an element.
 */
export interface Hoverable {
    /**
     * Hover the element.
     *
     * @param options
     *
     * @see {@link Locator.hover}
     */
    hover(options?: Parameters<Locator['hover']>[0]): Promise<void>;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link Hoverable} flow.
 *
 * **Details**
 *
 * The actions are proxied to the {@link Locator} implementation.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link Hoverable} flow
 */
export function useHoverableFlow<TBase extends ConstructorA<Locateable>>(Base: TBase): Flow<TBase, Hoverable> {
    abstract class Mixin extends Base implements Hoverable {
        /**
         * Hover the element.
         *
         * **Details**
         *
         * Proxied to the Playwright {@link Locator} implementation. The method is the same as executing:
         *
         * ```ts
         * page.locator(...).hover(options);
         * ```
         *
         * @param options
         *
         * @see {@link Locator.hover}
         */
        async hover(options?: Parameters<Locator['hover']>[0]): Promise<void> {
            return this.locate().hover(options);
        }
    }

    return Mixin;
}
